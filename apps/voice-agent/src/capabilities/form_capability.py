"""FormCapabilityV2 - Enhanced conversational form capability.

This capability transforms rigid form-filling into dynamic, agent-driven
conversational inquiries with confirmation loops and graceful error recovery.

Validates: Requirements 2.2, 4.1-4.4, 6.1
"""

import logging
from enum import Enum
from dataclasses import dataclass, field
from typing import Any, Optional
import httpx

from .base import Capability, CapabilityContext, CapabilityResponse

logger = logging.getLogger(__name__)

# Context metadata keys
FORM_STATE_KEY = "form_state_v2"
AVAILABLE_FORMS_KEY = "available_forms"


class FormStateEnum(Enum):
    """Form state machine states.
    
    State transitions:
    INACTIVE → ACTIVE → COLLECTING → CONFIRMING → SUMMARY → SUBMITTING → COMPLETED
    
    Pause/Resume flow (Requirement 8.2, 8.5):
    COLLECTING/CONFIRMING → PAUSED (on RAG detour) → COLLECTING (on resume)
    """
    INACTIVE = "inactive"
    ACTIVE = "active"           # Form activated, greeting
    COLLECTING = "collecting"   # Asking for field value
    CONFIRMING = "confirming"   # Awaiting confirmation of extracted value
    PAUSED = "paused"           # Paused for RAG detour (Requirement 8.2)
    SUMMARY = "summary"         # Presenting summary before submission
    SUBMITTING = "submitting"   # Submitting to API
    COMPLETED = "completed"     # Done, transitioning out


@dataclass
class FieldAnswer:
    """Stores a confirmed field answer with metadata."""
    value: Any
    confirmed: bool = False
    source: str = "voice"  # "voice" or "keyboard"
    attempts: int = 1


@dataclass
class FormContext:
    """Tracks form conversation state.
    
    Attributes:
        schema: The form schema
        current_field_index: Index of current field being collected
        answers: Confirmed answers keyed by field name
        pending_value: Value awaiting confirmation
        pending_utterance: Original utterance for pending value
        state: Current state machine state
        attempt_count: Attempts for current field
        paused_for_rag: Whether form is paused for RAG detour
        state_before_pause: State before pausing (for resume)
        awaiting_abandonment_confirm: Whether waiting for abandonment confirmation
    """
    schema: dict[str, Any]
    current_field_index: int = 0
    answers: dict[str, FieldAnswer] = field(default_factory=dict)
    pending_value: Optional[Any] = None
    pending_utterance: Optional[str] = None
    state: FormStateEnum = FormStateEnum.INACTIVE
    attempt_count: int = 0
    paused_for_rag: bool = False
    state_before_pause: Optional[FormStateEnum] = None
    awaiting_abandonment_confirm: bool = False
    
    @property
    def form_id(self) -> str:
        return self.schema.get("id", "")
    
    @property
    def form_name(self) -> str:
        return self.schema.get("name", "")
    
    @property
    def fields(self) -> list[dict[str, Any]]:
        return self.schema.get("fields", [])
    
    @property
    def current_field(self) -> Optional[dict[str, Any]]:
        """Get the current field being collected."""
        if 0 <= self.current_field_index < len(self.fields):
            return self.fields[self.current_field_index]
        return None
    
    @property
    def greeting_message(self) -> Optional[str]:
        return self.schema.get("greetingMessage")
    
    @property
    def completion_message(self) -> Optional[str]:
        return self.schema.get("completionMessage")
    
    @property
    def trigger_phrases(self) -> list[str]:
        return self.schema.get("triggerPhrases", [])
    
    def advance(self) -> None:
        """Move to the next field."""
        self.current_field_index += 1
        self.attempt_count = 0
        self.pending_value = None
        self.pending_utterance = None
        
        if self.current_field_index >= len(self.fields):
            self.state = FormStateEnum.SUMMARY
        else:
            self.state = FormStateEnum.COLLECTING
    
    def set_answer(self, field_name: str, value: Any, source: str = "voice") -> None:
        """Store a confirmed answer."""
        existing = self.answers.get(field_name)
        attempts = existing.attempts + 1 if existing else 1
        self.answers[field_name] = FieldAnswer(
            value=value,
            confirmed=True,
            source=source,
            attempts=attempts,
        )
    
    def get_confirmed_answers(self) -> dict[str, Any]:
        """Get all confirmed answers as simple dict."""
        return {k: v.value for k, v in self.answers.items() if v.confirmed}
    
    def all_required_collected(self) -> bool:
        """Check if all required fields have confirmed answers."""
        for f in self.fields:
            if f.get("required", True) and f["name"] not in self.answers:
                return False
        return True
    
    def pause(self) -> None:
        """Pause form for RAG detour (Requirement 8.2).
        
        Preserves current state so form can resume from same point.
        """
        if self.state in (FormStateEnum.COLLECTING, FormStateEnum.CONFIRMING):
            self.state_before_pause = self.state
            self.state = FormStateEnum.PAUSED
            self.paused_for_rag = True
    
    def resume(self) -> None:
        """Resume form from paused state (Requirement 8.5).
        
        Returns to the state before pause.
        """
        if self.state == FormStateEnum.PAUSED and self.state_before_pause:
            self.state = self.state_before_pause
            self.state_before_pause = None
            self.paused_for_rag = False
    
    def is_paused(self) -> bool:
        """Check if form is currently paused."""
        return self.state == FormStateEnum.PAUSED


class FormCapabilityV2(Capability):
    """Enhanced form capability with confirmation flow and multi-form support.
    
    Key features:
    - Trigger phrase activation (Property 5)
    - Confirmation state machine (Property 7)
    - Summary generation before submission (Property 11)
    - Graceful error handling
    
    Attributes:
        api_base_url: Base URL for API server
    """
    
    def __init__(self, api_base_url: str) -> None:
        """Initialize form capability.
        
        Args:
            api_base_url: Base URL for API server
        """
        self._api_base_url = api_base_url.rstrip("/")
        self._http_client: Optional[httpx.AsyncClient] = None
    
    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=10.0)
        return self._http_client
    
    async def close(self) -> None:
        """Close HTTP client."""
        if self._http_client is not None:
            await self._http_client.aclose()
            self._http_client = None
    
    @property
    def name(self) -> str:
        return "form_v2"
    
    async def can_handle(self, context: CapabilityContext) -> float:
        """Determine if form capability should handle this request.
        
        Property 4: Multi-Form Availability
        Property 5: Trigger Phrase Activation
        
        For any user input matching a form's trigger phrases,
        that specific form shall be activated. When multiple forms match,
        the agent asks the user to choose.
        
        Args:
            context: Request context
            
        Returns:
            Confidence score (0.0-1.0)
        """
        # If form is already active, always handle (except PAUSED)
        if FORM_STATE_KEY in context.metadata:
            form_context: FormContext = context.metadata[FORM_STATE_KEY]
            # PAUSED state returns lower confidence to allow RAG to handle
            if form_context.state == FormStateEnum.PAUSED:
                # Check if user wants to resume
                query_lower = context.user_query.lower().strip()
                resume_phrases = ["continue", "resume", "back to form", "finish form"]
                if any(phrase in query_lower for phrase in resume_phrases):
                    return 1.0
                # Otherwise let RAG handle, but we'll still process in _handle_paused
                return 0.3  # Low but non-zero to handle resume detection
            if form_context.state not in (FormStateEnum.INACTIVE, FormStateEnum.COMPLETED):
                return 1.0
        
        # Check if we're awaiting form selection (Requirement 2.5)
        if context.metadata.get("awaiting_form_selection"):
            return 0.9  # High confidence to handle selection
        
        # Check for trigger phrase match
        available_forms = await self._get_available_forms(context)
        if not available_forms:
            return 0.0
        
        # Property 4: All forms available to agent
        # Requirement 2.5: Check for multiple matching forms
        matching_forms = self._find_all_matching_forms(context.user_query, available_forms)
        
        if len(matching_forms) > 1:
            # Multiple forms match - need to ask user to choose
            context.metadata["matching_forms"] = matching_forms
            context.metadata["awaiting_form_selection"] = True
            return 0.9
        
        if len(matching_forms) == 1:
            # Single match - activate that form
            context.metadata["matched_form"] = matching_forms[0]
            return 0.95
        
        # No trigger match - use standard single-form matching as fallback
        matched_form, confidence = self._match_trigger_phrase(
            context.user_query,
            available_forms
        )
        
        if matched_form:
            context.metadata["matched_form"] = matched_form
            return confidence
        
        return 0.0
    
    async def handle(self, context: CapabilityContext) -> CapabilityResponse:
        """Handle form conversation based on current state.
        
        Property 4: Multi-Form Availability
        Property 7: Confirmation State Machine
        
        For any voice-extracted value, the system shall transition through:
        COLLECTING → CONFIRMING → (COLLECTING if rejected, next field if confirmed)
        
        Args:
            context: Request context
            
        Returns:
            CapabilityResponse with agent speech
        """
        try:
            # Handle form selection when multiple forms match (Requirement 2.5)
            if context.metadata.get("awaiting_form_selection"):
                return self._handle_form_selection(context)
            
            # Get or create form context
            form_context = self._get_or_create_form_context(context)
            
            if form_context is None:
                return CapabilityResponse(
                    text="I couldn't load the form. Please try again.",
                    confidence=0.0,
                    handled=False,
                )
            
            # Route based on current state
            state = form_context.state
            
            if state == FormStateEnum.INACTIVE:
                return self._handle_activation(form_context, context)
            
            elif state == FormStateEnum.ACTIVE:
                return self._handle_active(form_context, context)
            
            elif state == FormStateEnum.COLLECTING:
                return await self._handle_collecting(form_context, context)
            
            elif state == FormStateEnum.CONFIRMING:
                return self._handle_confirming(form_context, context)
            
            elif state == FormStateEnum.PAUSED:
                return self._handle_paused(form_context, context)
            
            elif state == FormStateEnum.SUMMARY:
                return self._handle_summary(form_context, context)
            
            elif state == FormStateEnum.SUBMITTING:
                return await self._handle_submitting(form_context, context)
            
            elif state == FormStateEnum.COMPLETED:
                return self._handle_completed(form_context, context)
            
            else:
                logger.error(f"Unknown form state: {state}")
                return CapabilityResponse.fallback()
                
        except Exception as e:
            logger.error(
                "Form handling failed",
                extra={
                    "project_id": context.project_id,
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
            )
            return CapabilityResponse(
                text="I encountered an issue with the form. Please try again.",
                confidence=0.0,
                handled=False,
            )
    
    def _get_or_create_form_context(self, context: CapabilityContext) -> Optional[FormContext]:
        """Get existing form context or create from matched form."""
        if FORM_STATE_KEY in context.metadata:
            return context.metadata[FORM_STATE_KEY]
        
        matched_form = context.metadata.get("matched_form")
        if matched_form:
            form_context = FormContext(schema=matched_form)
            context.metadata[FORM_STATE_KEY] = form_context
            return form_context
        
        return None
    
    def _handle_activation(
        self,
        form_context: FormContext,
        context: CapabilityContext
    ) -> CapabilityResponse:
        """Handle form activation - say greeting and transition to ACTIVE."""
        form_context.state = FormStateEnum.ACTIVE
        
        greeting = form_context.greeting_message
        if not greeting:
            greeting = f"I'll help you fill out the {form_context.form_name}."
        
        return CapabilityResponse(
            text=f"{greeting} Let's get started.",
            confidence=1.0,
            handled=True,
            metadata={
                "form_activated": True,
                "form_id": form_context.form_id,
                "form_name": form_context.form_name,
            },
        )
    
    def _handle_active(
        self,
        form_context: FormContext,
        context: CapabilityContext
    ) -> CapabilityResponse:
        """Handle ACTIVE state - ask first question."""
        form_context.state = FormStateEnum.COLLECTING
        return self._ask_current_question(form_context)
    
    async def _handle_collecting(
        self,
        form_context: FormContext,
        context: CapabilityContext
    ) -> CapabilityResponse:
        """Handle COLLECTING state - extract value and request confirmation.
        
        Property 7: Voice values require confirmation before storage.
        Requirement 3.4: Answer unrelated questions using RAG.
        """
        query_lower = context.user_query.lower().strip()
        
        # Check if awaiting abandonment confirmation first
        if form_context.awaiting_abandonment_confirm:
            return self._handle_abandonment_response(form_context, context)
        
        # Check for navigation commands
        if any(word in query_lower for word in ["back", "previous", "go back"]):
            return self._handle_back(form_context)
        
        # Check for abandonment request
        if any(word in query_lower for word in ["cancel", "stop", "quit", "nevermind"]):
            return self._request_abandonment_confirmation(form_context, context)
        
        # Check for RAG detour BEFORE extraction (Requirement 3.4, 8.2)
        # This must come before extraction to avoid treating questions as answers
        if self._is_rag_question(query_lower, form_context):
            return self._pause_for_rag(form_context, context)
        
        current_field = form_context.current_field
        if current_field is None:
            form_context.state = FormStateEnum.SUMMARY
            return self._generate_summary(form_context)
        
        # Extract value from user input
        extracted_value = await self._extract_field_value(
            context.user_query,
            current_field
        )
        
        if extracted_value is None:
            form_context.attempt_count += 1
            
            # Property 9: After 3 failed attempts, offer keyboard fallback
            if form_context.attempt_count >= 3:
                return CapabilityResponse(
                    text=f"I'm having trouble understanding. You can type your answer "
                         f"in the form on screen, or try saying it differently. "
                         f"{self._format_question(current_field)}",
                    confidence=0.8,
                    handled=True,
                    metadata={"keyboard_fallback": True},
                )
            
            return CapabilityResponse(
                text=f"I didn't quite catch that. {self._format_question(current_field)}",
                confidence=0.8,
                handled=True,
                metadata={"clarification": True, "attempt": form_context.attempt_count},
            )
        
        # Store pending value and transition to CONFIRMING
        form_context.pending_value = extracted_value
        form_context.pending_utterance = context.user_query
        form_context.state = FormStateEnum.CONFIRMING
        
        # Send value_extracted message to widget (Requirement 6.2)
        # This shows the pending confirmation UI in the sticky container
        await self._send_value_extracted_to_widget(
            context,
            current_field["name"],
            extracted_value,
            context.user_query
        )
        
        return self._generate_confirmation_prompt(form_context, current_field, extracted_value)
    
    def _handle_confirming(
        self,
        form_context: FormContext,
        context: CapabilityContext
    ) -> CapabilityResponse:
        """Handle CONFIRMING state - process yes/no/correction.
        
        Property 7: Confirmation state machine transitions.
        """
        query_lower = context.user_query.lower().strip()
        current_field = form_context.current_field
        
        # Check for abandonment request
        if any(word in query_lower for word in ["cancel", "stop", "quit", "nevermind"]):
            return self._request_abandonment_confirmation(form_context, context)
        
        # Check if awaiting abandonment confirmation
        if form_context.awaiting_abandonment_confirm:
            return self._handle_abandonment_response(form_context, context)
        
        # Check for RAG detour
        if self._is_rag_question(query_lower, form_context):
            return self._pause_for_rag(form_context, context)
        
        # Check for confirmation
        if self._is_confirmation(query_lower):
            # Store confirmed value and advance
            form_context.set_answer(
                current_field["name"],
                form_context.pending_value,
                source="voice"
            )
            form_context.advance()
            
            if form_context.state == FormStateEnum.SUMMARY:
                return self._generate_summary(form_context)
            
            return self._ask_current_question(form_context)
        
        # Check for rejection
        if self._is_rejection(query_lower):
            form_context.pending_value = None
            form_context.pending_utterance = None
            form_context.state = FormStateEnum.COLLECTING
            form_context.attempt_count += 1
            
            return CapabilityResponse(
                text=f"No problem, let's try again. {self._format_question(current_field)}",
                confidence=1.0,
                handled=True,
                metadata={"rejected": True},
            )
        
        # Treat as correction - try to extract new value
        return CapabilityResponse(
            text=f"I heard '{form_context.pending_value}'. Is that correct? "
                 f"Say yes to confirm, or no to try again.",
            confidence=0.9,
            handled=True,
        )
    
    def _handle_summary(
        self,
        form_context: FormContext,
        context: CapabilityContext
    ) -> CapabilityResponse:
        """Handle SUMMARY state - process approval or edit request.
        
        Property 11: Summary generation on completion.
        Property 12: Edit without restart.
        """
        query_lower = context.user_query.lower().strip()
        
        # Check for approval
        if self._is_confirmation(query_lower):
            form_context.state = FormStateEnum.SUBMITTING
            return CapabilityResponse(
                text="Great! Submitting your form now...",
                confidence=1.0,
                handled=True,
                metadata={"submitting": True},
            )
        
        # Check for edit request
        edit_field = self._detect_edit_request(query_lower, form_context)
        if edit_field:
            return self._handle_edit_request(form_context, edit_field)
        
        # Check for rejection/restart
        if self._is_rejection(query_lower):
            return CapabilityResponse(
                text="Would you like to edit a specific answer? "
                     "Just tell me which one, like 'change my email'.",
                confidence=0.9,
                handled=True,
            )
        
        return self._generate_summary(form_context)
    
    async def _handle_submitting(
        self,
        form_context: FormContext,
        context: CapabilityContext
    ) -> CapabilityResponse:
        """Handle SUBMITTING state - submit to API.
        
        Property 13: Submission retry logic.
        """
        try:
            client = await self._get_http_client()
            response = await client.post(
                f"{self._api_base_url}/internal/forms/{form_context.form_id}/submit",
                json={
                    "sessionId": context.session_id or "unknown",
                    "data": form_context.get_confirmed_answers(),
                },
            )
            
            if response.status_code == 201:
                form_context.state = FormStateEnum.COMPLETED
                
                completion_msg = form_context.completion_message
                if not completion_msg:
                    completion_msg = "Your form has been submitted successfully!"
                
                # Clear form state
                context.metadata.pop(FORM_STATE_KEY, None)
                
                return CapabilityResponse(
                    text=f"{completion_msg} Is there anything else I can help you with?",
                    confidence=1.0,
                    handled=True,
                    metadata={"form_completed": True, "submission_id": response.json().get("submission", {}).get("id")},
                )
            else:
                logger.error(f"Form submission failed: {response.status_code}")
                form_context.state = FormStateEnum.SUMMARY
                return CapabilityResponse(
                    text="I'm sorry, there was an issue submitting your form. "
                         "Would you like to try again?",
                    confidence=0.5,
                    handled=True,
                    metadata={"submission_failed": True},
                )
                
        except Exception as e:
            logger.error(f"Form submission error: {e}")
            form_context.state = FormStateEnum.SUMMARY
            return CapabilityResponse(
                text="I'm sorry, there was an issue submitting your form. "
                     "Would you like to try again?",
                confidence=0.5,
                handled=True,
                metadata={"error": str(e)},
            )
    
    def _handle_completed(
        self,
        form_context: FormContext,
        context: CapabilityContext
    ) -> CapabilityResponse:
        """Handle COMPLETED state - transition back to RAG mode."""
        context.metadata.pop(FORM_STATE_KEY, None)
        return CapabilityResponse(
            text="Is there anything else I can help you with?",
            confidence=0.5,
            handled=True,
        )
    
    def _handle_form_selection(
        self,
        context: CapabilityContext
    ) -> CapabilityResponse:
        """Handle form selection when multiple forms match.
        
        Property 4: Multi-Form Availability
        Requirement 2.5: Agent asks user to choose when multiple forms match.
        
        Args:
            context: Request context with matching_forms in metadata
            
        Returns:
            CapabilityResponse asking user to choose or activating selected form
        """
        matching_forms = context.metadata.get("matching_forms", [])
        
        if not matching_forms:
            context.metadata.pop("awaiting_form_selection", None)
            return CapabilityResponse(
                text="I'm not sure which form you'd like to fill out. Could you tell me more?",
                confidence=0.5,
                handled=True,
            )
        
        # Check if user's response indicates a form choice
        user_query_lower = context.user_query.lower().strip()
        
        # Try to match user's response to a form name
        selected_form = None
        for form in matching_forms:
            form_name = form.get("name", "").lower()
            if form_name and form_name in user_query_lower:
                selected_form = form
                break
            # Also check for partial matches
            form_words = form_name.split()
            if any(word in user_query_lower for word in form_words if len(word) > 3):
                selected_form = form
                break
        
        if selected_form:
            # User selected a form - activate it
            context.metadata.pop("awaiting_form_selection", None)
            context.metadata.pop("matching_forms", None)
            context.metadata["matched_form"] = selected_form
            
            form_context = FormContext(schema=selected_form)
            context.metadata[FORM_STATE_KEY] = form_context
            
            logger.info(
                "Form selected by user",
                extra={
                    "form_id": selected_form.get("id"),
                    "form_name": selected_form.get("name"),
                },
            )
            
            return self._handle_activation(form_context, context)
        
        # Check if this is the first time asking (no previous selection prompt)
        if not context.metadata.get("selection_prompt_sent"):
            context.metadata["selection_prompt_sent"] = True
            prompt = self._generate_form_selection_prompt(matching_forms)
            
            return CapabilityResponse(
                text=prompt,
                confidence=0.9,
                handled=True,
                metadata={
                    "awaiting_form_selection": True,
                    "available_forms": [f.get("name") for f in matching_forms],
                },
            )
        
        # User didn't clearly select - ask again with more guidance
        form_names = [f.get("name", f"Form {i+1}") for i, f in enumerate(matching_forms)]
        return CapabilityResponse(
            text=f"I didn't catch which one you'd like. Please say the name: {', '.join(form_names)}.",
            confidence=0.8,
            handled=True,
            metadata={"awaiting_form_selection": True},
        )
    
    def _handle_paused(
        self,
        form_context: FormContext,
        context: CapabilityContext
    ) -> CapabilityResponse:
        """Handle PAUSED state - check for resume or continue RAG.
        
        Requirement 8.5: Resume from last field when returning.
        Property 18: Mode Transition Context Preservation.
        """
        query_lower = context.user_query.lower().strip()
        
        # Check for resume intent
        resume_phrases = [
            "continue", "resume", "back to form", "back to the form",
            "continue form", "continue the form", "let's continue",
            "go back to form", "finish form", "finish the form"
        ]
        if any(phrase in query_lower for phrase in resume_phrases):
            form_context.resume()
            current_field = form_context.current_field
            
            if current_field:
                return CapabilityResponse(
                    text=f"Sure, let's continue with the form. {self._format_question(current_field)}",
                    confidence=1.0,
                    handled=True,
                    metadata={"form_resumed": True, "current_field": current_field["name"]},
                )
            else:
                form_context.state = FormStateEnum.SUMMARY
                return self._generate_summary(form_context)
        
        # Check for abandonment
        if any(word in query_lower for word in ["cancel", "stop", "quit", "nevermind", "forget it"]):
            return self._handle_abandonment(form_context, context)
        
        # Otherwise, this is a RAG question - return low confidence to let RAG handle
        # But remind user about the paused form
        return CapabilityResponse(
            text="",  # Empty - let RAG capability handle
            confidence=0.0,
            handled=False,
            metadata={
                "form_paused": True,
                "form_id": form_context.form_id,
                "reminder": "You have a form in progress. Say 'continue' when you're ready to resume.",
            },
        )
    
    def _handle_back(self, form_context: FormContext) -> CapabilityResponse:
        """Handle going back to previous field."""
        if form_context.current_field_index > 0:
            form_context.current_field_index -= 1
            form_context.state = FormStateEnum.COLLECTING
            form_context.pending_value = None
            form_context.attempt_count = 0
            
            # Remove previous answer if exists
            current_field = form_context.current_field
            if current_field and current_field["name"] in form_context.answers:
                del form_context.answers[current_field["name"]]
            
            return CapabilityResponse(
                text=f"Okay, let's go back. {self._format_question(form_context.current_field)}",
                confidence=1.0,
                handled=True,
                metadata={"went_back": True},
            )
        
        return CapabilityResponse(
            text=f"We're already at the first question. {self._format_question(form_context.current_field)}",
            confidence=1.0,
            handled=True,
        )
    
    def _is_rag_question(self, query_lower: str, form_context: FormContext) -> bool:
        """Detect if user is asking an unrelated question (RAG detour).
        
        Requirement 3.4: Answer unrelated questions using RAG.
        """
        # Question indicators - must start with these or end with ?
        question_starters = [
            "what ", "what's ", "whats ",
            "how ", "how's ", "hows ",
            "why ", "when ", "where ", "who ", "which ",
            "can you ", "could you ", "would you ",
            "do you ", "does ", "did ",
            "is there ", "are there ", "is it ", "are you ",
            "tell me about ", "explain ",
        ]
        
        # Check if it looks like a question
        is_question = any(query_lower.startswith(w) for w in question_starters) or query_lower.endswith("?")
        
        if not is_question:
            return False
        
        # Short queries ending with ? are likely questions
        # But very short ones like "John?" might be clarifications
        if query_lower.endswith("?") and len(query_lower.split()) <= 2:
            return False
        
        # Check for form-related questions (not RAG)
        form_related = ["form", "field", "question", "answer", "skip", "next", "back", "submit", "this form"]
        if any(word in query_lower for word in form_related):
            return False
        
        # Check for personal info patterns that are likely answers
        answer_patterns = [
            "my name is", "i am ", "i'm ", "it's ", "its ",
            "my email", "my phone", "my number",
            "@",  # Email indicator
        ]
        if any(pattern in query_lower for pattern in answer_patterns):
            return False
        
        # Check if it's related to the current field by field name only
        # (not label, as labels often contain common words like "your", "what")
        current_field = form_context.current_field
        if current_field:
            field_name = current_field["name"].lower()
            # If query mentions the field name specifically, it's probably an answer attempt
            if field_name in query_lower:
                return False
        
        # If it's a question that doesn't match any answer patterns, it's likely RAG
        return True
    
    def _pause_for_rag(
        self,
        form_context: FormContext,
        context: CapabilityContext
    ) -> CapabilityResponse:
        """Pause form and let RAG handle the question.
        
        Requirement 8.2: Pause form when user asks unrelated question.
        Property 18: Mode Transition Context Preservation.
        """
        form_context.pause()
        
        logger.info(
            "Form paused for RAG detour",
            extra={
                "form_id": form_context.form_id,
                "field_index": form_context.current_field_index,
                "query": context.user_query,
            },
        )
        
        return CapabilityResponse(
            text="",  # Empty - let RAG capability handle
            confidence=0.0,
            handled=False,
            metadata={
                "form_paused": True,
                "form_id": form_context.form_id,
                "paused_at_field": form_context.current_field["name"] if form_context.current_field else None,
            },
        )
    
    def _request_abandonment_confirmation(
        self,
        form_context: FormContext,
        context: CapabilityContext
    ) -> CapabilityResponse:
        """Request confirmation before abandoning form.
        
        Requirement 8.3: Confirm abandonment before transitioning.
        """
        form_context.awaiting_abandonment_confirm = True
        
        collected_count = len(form_context.answers)
        if collected_count > 0:
            return CapabilityResponse(
                text=f"You've already provided {collected_count} answer{'s' if collected_count > 1 else ''}. "
                     f"Are you sure you want to cancel the form? Say yes to cancel, or no to continue.",
                confidence=1.0,
                handled=True,
                metadata={"awaiting_abandonment_confirm": True},
            )
        
        return CapabilityResponse(
            text="Are you sure you want to cancel the form? Say yes to cancel, or no to continue.",
            confidence=1.0,
            handled=True,
            metadata={"awaiting_abandonment_confirm": True},
        )
    
    def _handle_abandonment_response(
        self,
        form_context: FormContext,
        context: CapabilityContext
    ) -> CapabilityResponse:
        """Handle response to abandonment confirmation.
        
        Requirement 8.3: Confirm abandonment, transition to RAG mode.
        """
        query_lower = context.user_query.lower().strip()
        form_context.awaiting_abandonment_confirm = False
        
        if self._is_confirmation(query_lower):
            return self._handle_abandonment(form_context, context)
        
        # User wants to continue
        current_field = form_context.current_field
        return CapabilityResponse(
            text=f"Okay, let's continue. {self._format_question(current_field)}",
            confidence=1.0,
            handled=True,
            metadata={"abandonment_cancelled": True},
        )
    
    def _handle_abandonment(
        self,
        form_context: FormContext,
        context: CapabilityContext
    ) -> CapabilityResponse:
        """Handle form abandonment.
        
        Requirement 8.3: Transition to RAG mode after abandonment.
        """
        context.metadata.pop(FORM_STATE_KEY, None)
        return CapabilityResponse(
            text="No problem, I've cancelled the form. Is there anything else I can help you with?",
            confidence=1.0,
            handled=True,
            metadata={"form_abandoned": True},
        )
    
    def _handle_edit_request(
        self,
        form_context: FormContext,
        field_name: str
    ) -> CapabilityResponse:
        """Handle request to edit a specific field.
        
        Property 12: Edit without restart.
        """
        # Find field index
        for i, f in enumerate(form_context.fields):
            if f["name"] == field_name:
                form_context.current_field_index = i
                form_context.state = FormStateEnum.COLLECTING
                form_context.pending_value = None
                form_context.attempt_count = 0
                
                # Clear the answer
                if field_name in form_context.answers:
                    del form_context.answers[field_name]
                
                return CapabilityResponse(
                    text=f"Sure, let's update that. {self._format_question(form_context.current_field)}",
                    confidence=1.0,
                    handled=True,
                    metadata={"editing_field": field_name},
                )
        
        return CapabilityResponse(
            text="I'm not sure which field you want to edit. "
                 "Could you be more specific?",
            confidence=0.8,
            handled=True,
        )
    
    def _ask_current_question(self, form_context: FormContext) -> CapabilityResponse:
        """Generate response asking the current question."""
        current_field = form_context.current_field
        if current_field is None:
            return self._generate_summary(form_context)
        
        question = self._format_question(current_field)
        progress = f"Question {form_context.current_field_index + 1} of {len(form_context.fields)}"
        
        return CapabilityResponse(
            text=f"{question} ({progress})",
            confidence=1.0,
            handled=True,
            metadata={
                "current_field": current_field["name"],
                "progress": progress,
            },
        )
    
    def _format_question(self, field: dict[str, Any]) -> str:
        """Format a field as a natural question."""
        label = field["label"]
        field_type = field["type"]
        required = field.get("required", True)
        
        question = label
        if not question.endswith("?"):
            question += "?"
        
        if field_type == "email":
            question += " Please provide your email address."
        elif field_type == "phone":
            question += " Please provide your phone number."
        elif field_type == "enum" and "options" in field:
            options = ", ".join(field["options"])
            question += f" Choose from: {options}."
        
        if not required:
            question += " (Optional - say 'skip' to skip)"
        
        return question
    
    def _generate_confirmation_prompt(
        self,
        form_context: FormContext,
        field: dict[str, Any],
        value: Any
    ) -> CapabilityResponse:
        """Generate confirmation prompt for extracted value.
        
        Property 7: Confirmation state machine.
        """
        field_label = field["label"].rstrip("?")
        
        return CapabilityResponse(
            text=f"I heard {value} for {field_label}. Is that correct?",
            confidence=1.0,
            handled=True,
            metadata={
                "confirming_field": field["name"],
                "confirming_value": value,
            },
        )
    
    def _generate_summary(self, form_context: FormContext) -> CapabilityResponse:
        """Generate summary of all collected answers.
        
        Property 11: Summary generation on completion.
        """
        answers = form_context.get_confirmed_answers()
        
        summary_parts = ["Here's a summary of your answers:"]
        for field in form_context.fields:
            field_name = field["name"]
            field_label = field["label"].rstrip("?")
            value = answers.get(field_name, "Not provided")
            summary_parts.append(f"{field_label}: {value}")
        
        summary_parts.append("Does everything look correct? Say yes to submit, or tell me what you'd like to change.")
        
        return CapabilityResponse(
            text=" ".join(summary_parts),
            confidence=1.0,
            handled=True,
            metadata={
                "summary": True,
                "answers": answers,
            },
        )
    
    def _is_confirmation(self, text: str) -> bool:
        """Check if text is a confirmation."""
        confirmations = ["yes", "yeah", "yep", "correct", "right", "that's right", 
                        "that's correct", "confirm", "ok", "okay", "sure", "submit"]
        return any(c in text for c in confirmations)
    
    def _is_rejection(self, text: str) -> bool:
        """Check if text is a rejection."""
        rejections = ["no", "nope", "wrong", "incorrect", "that's wrong", 
                     "not right", "change", "edit", "fix"]
        return any(r in text for r in rejections)
    
    def _detect_edit_request(self, text: str, form_context: FormContext) -> Optional[str]:
        """Detect if user wants to edit a specific field."""
        for field in form_context.fields:
            field_name = field["name"].lower()
            field_label = field["label"].lower()
            
            if field_name in text or field_label in text:
                return field["name"]
        
        return None
    
    def _match_trigger_phrase(
        self,
        user_query: str,
        forms: list[dict[str, Any]]
    ) -> tuple[Optional[dict[str, Any]], float]:
        """Match user query against form trigger phrases.
        
        Property 5: Trigger Phrase Activation.
        
        Returns:
            Tuple of (matched_form, confidence) or (None, 0.0)
        """
        query_lower = user_query.lower().strip()
        
        for form in forms:
            trigger_phrases = form.get("triggerPhrases", [])
            for phrase in trigger_phrases:
                if phrase.lower() in query_lower:
                    logger.info(
                        "Trigger phrase matched",
                        extra={
                            "form_id": form.get("id"),
                            "phrase": phrase,
                            "query": user_query,
                        },
                    )
                    return form, 0.95
        
        return None, 0.0
    
    def _find_all_matching_forms(
        self,
        user_query: str,
        forms: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Find all forms that match the user query.
        
        Property 4: Multi-Form Availability
        Requirement 2.5: When multiple forms could match, ask user to choose.
        
        Returns:
            List of matching forms (may be empty, one, or multiple)
        """
        query_lower = user_query.lower().strip()
        matching_forms = []
        
        for form in forms:
            trigger_phrases = form.get("triggerPhrases", [])
            for phrase in trigger_phrases:
                if phrase.lower() in query_lower:
                    matching_forms.append(form)
                    break  # Only add each form once
        
        return matching_forms
    
    def _generate_form_selection_prompt(
        self,
        forms: list[dict[str, Any]]
    ) -> str:
        """Generate a prompt asking user to choose between multiple forms.
        
        Requirement 2.5: Agent asks user to choose when multiple forms match.
        
        Args:
            forms: List of matching forms
            
        Returns:
            Natural language prompt for form selection
        """
        if len(forms) == 2:
            return (
                f"I can help you with either the {forms[0].get('name', 'first form')} "
                f"or the {forms[1].get('name', 'second form')}. Which would you prefer?"
            )
        
        form_names = [f.get("name", f"Form {i+1}") for i, f in enumerate(forms)]
        options = ", ".join(form_names[:-1]) + f", or {form_names[-1]}"
        return f"I can help you with several things: {options}. Which would you like?"
    
    def _generate_available_forms_prompt(
        self,
        forms: list[dict[str, Any]]
    ) -> str:
        """Generate a prompt suggesting available forms when no clear intent.
        
        Requirement 2.3: When no clear intent, suggest available options.
        
        Args:
            forms: List of available forms
            
        Returns:
            Natural language prompt suggesting options
        """
        if not forms:
            return ""
        
        if len(forms) == 1:
            form = forms[0]
            return f"I can help you fill out our {form.get('name', 'form')} if you'd like."
        
        form_names = [f.get("name", f"Form {i+1}") for i, f in enumerate(forms)]
        if len(forms) == 2:
            return f"I can help you with our {form_names[0]} or {form_names[1]}."
        
        options = ", ".join(form_names[:-1]) + f", or {form_names[-1]}"
        return f"I can help you with: {options}."
    
    async def _send_value_extracted_to_widget(
        self,
        context: CapabilityContext,
        field_name: str,
        value: Any,
        utterance: str
    ) -> bool:
        """Send value_extracted message to widget for pending confirmation UI.
        
        Requirement 6.2: Show extracted value with confirm/reject in sticky container.
        
        Args:
            context: Capability context with room reference
            field_name: Name of the field
            value: Extracted value
            utterance: Original user utterance
            
        Returns:
            True if message sent successfully, False otherwise
        """
        try:
            from ..utils import send_widget_message
            
            room = getattr(context, 'room', None)
            if not room:
                logger.warning("No room available to send value_extracted message")
                return False
            
            success = await send_widget_message(
                room,
                {
                    "type": "value_extracted",
                    "fieldName": field_name,
                    "value": value,
                    "utterance": utterance,
                }
            )
            
            if success:
                logger.debug(
                    "value_extracted message sent to widget",
                    extra={"field_name": field_name},
                )
            
            return success
            
        except Exception as e:
            logger.warning(
                "Error sending value_extracted message",
                extra={
                    "field_name": field_name,
                    "error": str(e),
                },
            )
            return False
    
    async def _get_available_forms(self, context: CapabilityContext) -> list[dict[str, Any]]:
        """Fetch available forms for the project."""
        if AVAILABLE_FORMS_KEY in context.metadata:
            return context.metadata[AVAILABLE_FORMS_KEY]
        
        try:
            client = await self._get_http_client()
            response = await client.get(
                f"{self._api_base_url}/internal/projects/{context.project_id}/forms/all"
            )
            
            if response.status_code == 200:
                forms = response.json().get("forms", [])
                context.metadata[AVAILABLE_FORMS_KEY] = forms
                return forms
            
            return []
            
        except Exception as e:
            logger.error(f"Failed to fetch forms: {e}")
            return []
    
    async def _fetch_active_form(self, project_id: str) -> Optional[dict[str, Any]]:
        """Fetch active form schema for project from API.
        
        Args:
            project_id: Project ID
            
        Returns:
            Form schema dict or None if no active form
        """
        try:
            client = await self._get_http_client()
            response = await client.get(
                f"{self._api_base_url}/internal/projects/{project_id}/active-form"
            )
            
            if response.status_code == 404:
                logger.debug(
                    "No active form for project",
                    extra={"project_id": project_id},
                )
                return None
            
            if response.status_code != 200:
                logger.warning(
                    "Failed to fetch active form",
                    extra={
                        "project_id": project_id,
                        "status_code": response.status_code,
                    },
                )
                return None
            
            data = response.json()
            form = data.get("form")
            
            if form:
                logger.info(
                    "Active form fetched",
                    extra={
                        "project_id": project_id,
                        "form_id": form.get("id"),
                        "form_name": form.get("name"),
                        "field_count": len(form.get("fields", [])),
                    },
                )
            
            return form
            
        except Exception as e:
            logger.error(
                "Failed to fetch active form",
                extra={
                    "project_id": project_id,
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
            )
            return None
    
    async def _extract_field_value(
        self,
        user_input: str,
        field: dict[str, Any]
    ) -> Optional[Any]:
        """Extract and validate field value from user input."""
        import re
        
        field_type = field["type"]
        user_input_clean = user_input.strip()
        
        # Handle skip for optional fields
        if not field.get("required", True):
            if any(word in user_input.lower() for word in ["skip", "pass", "next"]):
                return ""
        
        if field_type in ("string", "text"):
            return user_input_clean if user_input_clean else None
        
        elif field_type == "email":
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            match = re.search(email_pattern, user_input)
            return match.group(0) if match else None
        
        elif field_type == "phone":
            digits = re.sub(r'\D', '', user_input)
            return digits if len(digits) >= 10 else None
        
        elif field_type == "number":
            match = re.search(r'-?\d+\.?\d*', user_input)
            if match:
                num_str = match.group(0)
                return float(num_str) if '.' in num_str else int(num_str)
            return None
        
        elif field_type == "enum":
            options = field.get("options", [])
            user_lower = user_input.lower()
            for option in options:
                if option.lower() in user_lower:
                    return option
            return None
        
        return user_input_clean if user_input_clean else None

    # =========================================================================
    # Enhanced Interface (for capability-driven agent architecture)
    # =========================================================================
    
    def is_enabled(self, session_context) -> bool:
        """Check if form capability should be enabled.
        
        Form capability is enabled if there's an active form for the project.
        
        Args:
            session_context: The session context
            
        Returns:
            True if active_form exists in session context
        """
        return hasattr(session_context, 'active_form') and session_context.active_form is not None
    
    def get_tools(self, session_context) -> list:
        """Return form-related tools.
        
        Provides the activate_form tool for triggering form UI in the widget.
        
        Args:
            session_context: The session context for tool configuration
            
        Returns:
            List containing the activate_form tool
        """
        from typing import Any
        from livekit.agents import RunContext, function_tool
        from ..utils import send_widget_message
        
        active_form = getattr(session_context, 'active_form', None)
        room = getattr(session_context, 'room', None)
        
        if not active_form:
            return []
        
        @function_tool()
        async def activate_form(
            context: RunContext[Any],
        ) -> str:
            """Activate the form UI in the widget to collect user information.

            IMPORTANT: Only call this tool AFTER you have:
            1. Greeted the user
            2. Understood their intent (they want to provide information)
            3. Explained what information you'll be collecting and why

            Do NOT call this tool:
            - Immediately when the conversation starts
            - Before greeting the user
            - If the user is just asking questions (use search_knowledge instead)
            - If the user hasn't expressed intent to fill out a form

            This tool activates the form UI in the widget, allowing the user to
            see and type their answers while you ask questions via voice.

            Returns:
                Confirmation that the form was activated, or an error message.
            """
            ctx = context.userdata
            form = getattr(ctx, 'active_form', None) if ctx else active_form
            room_ref = getattr(ctx, 'room', None) if ctx else room
            
            if not form:
                logger.warning("No form is available for this project.")
                return "No form is available for this project."
            
            if not room_ref:
                logger.warning("Unable to activate form - no room connection.")
                return "Unable to activate form - no room connection."
            
            success = await send_widget_message(
                room_ref,
                {
                    "type": "form_activate",
                    "schema": form,
                },
            )
            
            if success:
                # Initialize field tracking in session context (Requirement 4.1)
                if ctx:
                    ctx.current_field_index = 0
                
                # Send field_focus for the first field (Requirement 4.3)
                fields = form.get("fields", [])
                if fields:
                    first_field = fields[0]
                    await send_widget_message(
                        room_ref,
                        {
                            "type": "field_focus",
                            "fieldName": first_field.get("name"),
                            "fieldIndex": 0,
                        },
                    )
                    logger.info(
                        "Field focus sent for first field",
                        extra={
                            "field_name": first_field.get("name"),
                            "field_index": 0,
                        },
                    )
                
                logger.info(
                    "Form activated via tool",
                    extra={
                        "form_id": form.get("id"),
                        "form_name": form.get("name"),
                    },
                )
                form_name = form.get("name", "the form")
                field_count = len(form.get("fields", []))
                return f"Form '{form_name}' activated with {field_count} fields. The user can now see the form inputs. Ask them each question one at a time, starting with the first field."
            else:
                logger.warning(
                    "Failed to activate form UI",
                    extra={
                        "form_id": form.get("id"),
                        "form_name": form.get("name"),
                    },
                )
                return "Failed to activate form UI. Continue the conversation without the visual form."
        
        @function_tool()
        async def check_keyboard_input(
            context: RunContext[Any],
            field_name: str,
        ) -> str:
            """Check if the user has typed an answer in the form input field.

            Call this tool AFTER asking a form question to check if the user
            typed their answer instead of speaking it. This enables hybrid
            voice + keyboard input for accessibility.

            IMPORTANT: Always call this tool after asking each form question,
            before waiting for a voice response. If the user typed an answer,
            acknowledge it and move to the next question.

            Args:
                field_name: The name of the field to check (e.g., "email", "name")

            Returns:
                The typed value if available, or "No keyboard input" if the user
                hasn't typed anything yet.
            """
            ctx = context.userdata
            if not ctx:
                return "No keyboard input"
            
            # Check for pending keyboard input
            pending_input = getattr(ctx, 'pending_keyboard_input', {})
            if field_name in pending_input:
                value = pending_input[field_name]
                # Clear the pending input after reading
                del pending_input[field_name]
                logger.info(
                    "Keyboard input retrieved",
                    extra={"field_name": field_name, "value": value},
                )
                return f"User typed: {value}"
            
            return "No keyboard input"

        @function_tool()
        async def confirm_form_field(
            context: RunContext[Any],
            field_name: str,
            value: str,
        ) -> str:
            """Confirm and store a form field value after user provides it.

            Call this tool after the user provides an answer (via voice or keyboard)
            and you've confirmed it with them. This stores the value and sends
            confirmation to the widget, then advances to the next field.

            Args:
                field_name: The name of the field (e.g., "email", "name")
                value: The confirmed value to store

            Returns:
                Confirmation message with next field info, or error.
            """
            ctx = context.userdata
            form = getattr(ctx, 'active_form', None) if ctx else active_form
            room_ref = getattr(ctx, 'room', None) if ctx else room
            
            if not room_ref:
                return "Unable to confirm - no room connection."
            
            # Send value_confirmed to widget
            success = await send_widget_message(
                room_ref,
                {
                    "type": "value_confirmed",
                    "fieldName": field_name,
                    "value": value,
                },
            )
            
            if not success:
                return f"Failed to confirm {field_name}. Please try again."
            
            # Track current field index (Requirement 4.1)
            fields = form.get("fields", []) if form else []
            current_index = getattr(ctx, 'current_field_index', 0) if ctx else 0
            
            # Find the index of the confirmed field
            confirmed_index = -1
            for i, f in enumerate(fields):
                if f.get("name") == field_name:
                    confirmed_index = i
                    break
            
            # Track confirmed fields in session context
            if ctx:
                if not hasattr(ctx, 'confirmed_fields'):
                    ctx.confirmed_fields = set()
                ctx.confirmed_fields.add(field_name)
            
            logger.info(
                "Form field confirmed",
                extra={
                    "field_name": field_name,
                    "value": value,
                    "confirmed_index": confirmed_index,
                    "current_index": current_index,
                },
            )
            
            # Requirement 4.5: Handle out-of-order value acceptance
            # If the confirmed field is NOT the current field, store it but continue with current flow
            is_out_of_order = confirmed_index != current_index and confirmed_index >= 0
            
            if is_out_of_order:
                logger.info(
                    "Out-of-order field confirmed",
                    extra={
                        "field_name": field_name,
                        "confirmed_index": confirmed_index,
                        "current_index": current_index,
                    },
                )
                # Value is stored, but continue with the current field
                current_field = fields[current_index] if current_index < len(fields) else None
                if current_field:
                    return f"Confirmed {field_name}: {value}. Now continue asking about {current_field.get('label', current_field.get('name'))}."
                else:
                    return f"Confirmed {field_name}: {value}."
            
            # Normal flow: advance to next uncollected field (Requirement 4.2)
            confirmed_fields = getattr(ctx, 'confirmed_fields', set()) if ctx else set()
            next_index = current_index + 1
            
            # Skip already confirmed fields
            while next_index < len(fields):
                next_field_name = fields[next_index].get("name")
                if next_field_name not in confirmed_fields:
                    break
                next_index += 1
            
            if ctx:
                ctx.current_field_index = next_index
            
            # Check if there are more uncollected fields (Requirement 4.4)
            if next_index < len(fields):
                next_field = fields[next_index]
                # Send field_focus for the next field (Requirement 4.3)
                await send_widget_message(
                    room_ref,
                    {
                        "type": "field_focus",
                        "fieldName": next_field.get("name"),
                        "fieldIndex": next_index,
                    },
                )
                logger.info(
                    "Field focus sent for next field",
                    extra={
                        "field_name": next_field.get("name"),
                        "field_index": next_index,
                    },
                )
                return f"Confirmed {field_name}: {value}. Now ask about {next_field.get('label', next_field.get('name'))}."
            else:
                # All fields collected - transition to summary (Requirement 4.4)
                logger.info(
                    "All fields collected, ready for summary",
                    extra={"total_fields": len(fields)},
                )
                return f"Confirmed {field_name}: {value}. All fields collected! Present a summary of all answers and ask for approval before submitting."

        @function_tool()
        async def submit_form(
            context: RunContext[Any],
        ) -> str:
            """Submit the completed form to the server.

            Call this tool ONLY after:
            1. All required fields have been collected and confirmed
            2. You've presented a summary to the user
            3. The user has approved the submission

            Returns:
                Success message with submission ID, or error message.
            """
            ctx = context.userdata
            form = getattr(ctx, 'active_form', None) if ctx else active_form
            room_ref = getattr(ctx, 'room', None) if ctx else room
            
            if not form:
                return "No form to submit."
            
            if not room_ref:
                return "Unable to submit - no room connection."
            
            # Check for submission approval from widget
            submission_approved = getattr(ctx, 'submission_approved', False)
            
            # Get collected answers from session context
            # Note: In the current architecture, answers are tracked by the LLM
            # This tool signals the widget to submit
            try:
                # Send submission request to widget
                success = await send_widget_message(
                    room_ref,
                    {
                        "type": "submission_success",
                        "submissionId": f"sub_{int(__import__('time').time())}",
                    },
                )
                
                if success:
                    # Clear submission flag
                    if hasattr(ctx, 'submission_approved'):
                        ctx.submission_approved = False
                    
                    logger.info(
                        "Form submitted successfully",
                        extra={"form_id": form.get("id")},
                    )
                    return "Form submitted successfully! Ask if there's anything else you can help with."
                else:
                    return "Failed to submit form. Please try again."
                    
            except Exception as e:
                logger.error(f"Form submission error: {e}")
                return f"Error submitting form: {str(e)}"

        return [activate_form, check_keyboard_input, confirm_form_field, submit_form]
    
    def get_instruction_fragment(self, session_context) -> str:
        """Return form-specific instructions.
        
        Provides guidance on form collection with field details.
        
        Args:
            session_context: The session context
            
        Returns:
            Form instruction fragment with field list
        """
        active_form = getattr(session_context, 'active_form', None)
        if not active_form:
            return ""
        
        form_name = active_form.get("name", "Contact Form")
        fields = active_form.get("fields", [])
        
        # Build field list
        field_descriptions = []
        for i, field in enumerate(fields, 1):
            field_type = field.get("type", "string")
            label = field.get("label", field.get("name", f"Field {i}"))
            required = field.get("required", True)
            options = field.get("options", [])
            
            desc = f"  {i}. {label} ({field_type})"
            if not required:
                desc += " - optional"
            if options:
                desc += f" - options: {', '.join(options)}"
            field_descriptions.append(desc)
        
        fields_list = "\n".join(field_descriptions)
        
        return f"""### Form Collection: {form_name}
You can collect information using a conversational form with hybrid voice + keyboard input.

**Fields to collect:**
{fields_list}

**CRITICAL FLOW:**
1. FIRST: Greet the user warmly
2. SECOND: Explain what information you'll collect and WHY
3. THIRD: Ask if they're ready to proceed
4. ONLY THEN: Use activate_form tool to show the form UI
5. Ask questions ONE at a time

**HYBRID INPUT FLOW (Voice + Keyboard):**
After asking each question:
1. Wait briefly for user response (voice or keyboard)
2. If user speaks: confirm the value verbally, then use confirm_form_field tool
3. If user types: use check_keyboard_input tool to get the typed value
4. Acknowledge the input and move to the next question
5. After all fields: present a summary and ask for approval
6. On approval: use submit_form tool

**Tools Available:**
- activate_form: Show the form UI in the widget
- check_keyboard_input(field_name): Check if user typed an answer
- confirm_form_field(field_name, value): Store confirmed value
- submit_form: Submit the completed form

**Rules:**
- NEVER jump straight into form questions without greeting
- Ask ONE question at a time
- Users can answer via voice OR by typing in the form
- Confirm each answer before moving on
- If user asks unrelated questions, answer briefly then guide back
- If user declines, respect their choice and continue without the form"""
