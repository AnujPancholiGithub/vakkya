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
    """
    INACTIVE = "inactive"
    ACTIVE = "active"           # Form activated, greeting
    COLLECTING = "collecting"   # Asking for field value
    CONFIRMING = "confirming"   # Awaiting confirmation of extracted value
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
    """
    schema: dict[str, Any]
    current_field_index: int = 0
    answers: dict[str, FieldAnswer] = field(default_factory=dict)
    pending_value: Optional[Any] = None
    pending_utterance: Optional[str] = None
    state: FormStateEnum = FormStateEnum.INACTIVE
    attempt_count: int = 0
    paused_for_rag: bool = False
    
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
        
        Property 5: Trigger Phrase Activation
        For any user input matching a form's trigger phrases,
        that specific form shall be activated.
        
        Args:
            context: Request context
            
        Returns:
            Confidence score (0.0-1.0)
        """
        # If form is already active, always handle
        if FORM_STATE_KEY in context.metadata:
            form_context: FormContext = context.metadata[FORM_STATE_KEY]
            if form_context.state not in (FormStateEnum.INACTIVE, FormStateEnum.COMPLETED):
                return 1.0
        
        # Check for trigger phrase match
        available_forms = await self._get_available_forms(context)
        if not available_forms:
            return 0.0
        
        matched_form, confidence = self._match_trigger_phrase(
            context.user_query,
            available_forms
        )
        
        if matched_form:
            # Store matched form for handle() to use
            context.metadata["matched_form"] = matched_form
            return confidence
        
        return 0.0
    
    async def handle(self, context: CapabilityContext) -> CapabilityResponse:
        """Handle form conversation based on current state.
        
        Property 7: Confirmation State Machine
        For any voice-extracted value, the system shall transition through:
        COLLECTING → CONFIRMING → (COLLECTING if rejected, next field if confirmed)
        
        Args:
            context: Request context
            
        Returns:
            CapabilityResponse with agent speech
        """
        try:
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
        """
        query_lower = context.user_query.lower().strip()
        
        # Check for navigation commands
        if any(word in query_lower for word in ["back", "previous", "go back"]):
            return self._handle_back(form_context)
        
        # Check for abandonment
        if any(word in query_lower for word in ["cancel", "stop", "quit", "nevermind"]):
            return self._handle_abandonment(form_context, context)
        
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
                f"{self._api_base_url}/api/internal/forms/{form_context.form_id}/submit",
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
    
    def _handle_abandonment(
        self,
        form_context: FormContext,
        context: CapabilityContext
    ) -> CapabilityResponse:
        """Handle form abandonment."""
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
    
    async def _get_available_forms(self, context: CapabilityContext) -> list[dict[str, Any]]:
        """Fetch available forms for the project."""
        if AVAILABLE_FORMS_KEY in context.metadata:
            return context.metadata[AVAILABLE_FORMS_KEY]
        
        try:
            client = await self._get_http_client()
            response = await client.get(
                f"{self._api_base_url}/api/internal/projects/{context.project_id}/forms/all"
            )
            
            if response.status_code == 200:
                forms = response.json().get("forms", [])
                context.metadata[AVAILABLE_FORMS_KEY] = forms
                return forms
            
            return []
            
        except Exception as e:
            logger.error(f"Failed to fetch forms: {e}")
            return []
    
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
