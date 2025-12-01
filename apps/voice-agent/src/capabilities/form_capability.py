"""Form capability for conversational form filling.

This capability guides users through form fields one at a time,
extracting typed values from voice input using LLM function calling.
"""

import logging
from typing import Any, Optional
import httpx

from .base import Capability, CapabilityContext, CapabilityResponse

logger = logging.getLogger(__name__)

# Form state keys in context metadata
FORM_STATE_KEY = "form_state"
FORM_SCHEMA_KEY = "form_schema"


class FormState:
    """Tracks progress through a form conversation."""
    
    def __init__(self, form_schema: dict[str, Any]):
        """Initialize form state.
        
        Args:
            form_schema: The form schema with id, name, fields
        """
        self.form_id: str = form_schema["id"]
        self.form_name: str = form_schema["name"]
        self.fields: list[dict[str, Any]] = form_schema["fields"]
        self.current_index: int = 0
        self.answers: dict[str, Any] = {}
        self.completed: bool = False
    
    @property
    def current_field(self) -> Optional[dict[str, Any]]:
        """Get the current field being asked."""
        if 0 <= self.current_index < len(self.fields):
            return self.fields[self.current_index]
        return None
    
    def advance(self) -> None:
        """Move to the next field."""
        self.current_index += 1
        if self.current_index >= len(self.fields):
            self.completed = True
    
    def go_back(self) -> bool:
        """Go back to the previous field.
        
        Returns:
            True if went back, False if already at first field
        """
        if self.current_index > 0:
            self.current_index -= 1
            return True
        return False
    
    def set_answer(self, field_name: str, value: Any) -> None:
        """Store an answer for a field."""
        self.answers[field_name] = value


class FormCapability(Capability):
    """Capability for guiding users through conversational forms.
    
    Handles:
    - One-question-at-a-time flow
    - Field value extraction from voice input
    - Navigation (back, skip)
    - Form submission via webhook
    
    Attributes:
        api_base_url: Base URL for API server
    """
    
    def __init__(self, api_base_url: str) -> None:
        """Initialize form capability.
        
        Args:
            api_base_url: Base URL for API server (e.g., http://localhost:3000)
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
        return "form"
    
    async def can_handle(self, context: CapabilityContext) -> float:
        """Determine if form capability should handle this request.
        
        Form capability has highest priority when:
        1. A form is active in the session (form_state exists)
        2. A form schema is configured for the project
        
        Args:
            context: Request context
            
        Returns:
            Confidence score (0.0-1.0)
        """
        # If form is already active, always handle with highest confidence
        if FORM_STATE_KEY in context.metadata:
            return 1.0
        
        # Check if project has an active form schema
        form_schema = await self._fetch_active_form(context.project_id)
        if form_schema:
            # Store schema in context for handle() to use
            context.metadata[FORM_SCHEMA_KEY] = form_schema
            return 0.9  # High confidence to start form
        
        return 0.0  # No form configured
    
    async def handle(self, context: CapabilityContext) -> CapabilityResponse:
        """Handle form conversation flow.
        
        Args:
            context: Request context with user query
            
        Returns:
            CapabilityResponse with next question or completion message
        """
        try:
            # Get or initialize form state
            form_state = self._get_or_create_form_state(context)
            
            if form_state is None:
                return CapabilityResponse(
                    text="I couldn't load the form. Please try again.",
                    confidence=0.0,
                    handled=False,
                )
            
            # Check for navigation commands
            query_lower = context.user_query.lower().strip()
            if any(word in query_lower for word in ["back", "previous", "go back"]):
                return self._handle_back(form_state)
            
            # Get current field
            current_field = form_state.current_field
            if current_field is None:
                # Form completed
                return await self._handle_completion(form_state, context)
            
            # If form just started (no answers yet), ask first question
            # Check for common start phrases that shouldn't be treated as answers
            start_phrases = ["start", "begin", "let's go", "ready", "yes", "ok", "okay"]
            if not form_state.answers and any(phrase in query_lower for phrase in start_phrases):
                return self._ask_current_question(form_state, context)
            
            # Extract and validate field value
            extracted_value = await self._extract_field_value(
                context.user_query,
                current_field
            )
            
            if extracted_value is None:
                # Couldn't extract value, ask for clarification
                return CapabilityResponse(
                    text=f"I didn't quite catch that. {self._format_question(current_field)}",
                    confidence=0.8,
                    handled=True,
                    metadata={"form_state": form_state, "clarification": True},
                )
            
            # Store answer and advance
            form_state.set_answer(current_field["name"], extracted_value)
            form_state.advance()
            
            # Update context metadata
            context.metadata[FORM_STATE_KEY] = form_state
            
            # Check if form is complete
            if form_state.completed:
                return await self._handle_completion(form_state, context)
            
            # Ask next question
            return self._ask_current_question(form_state, context)
            
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
                metadata={"error": str(e)},
            )
    
    def _get_or_create_form_state(self, context: CapabilityContext) -> Optional[FormState]:
        """Get existing form state or create new one from schema."""
        # Check if form state already exists
        if FORM_STATE_KEY in context.metadata:
            return context.metadata[FORM_STATE_KEY]
        
        # Create new form state from schema
        form_schema = context.metadata.get(FORM_SCHEMA_KEY)
        if form_schema:
            form_state = FormState(form_schema)
            context.metadata[FORM_STATE_KEY] = form_state
            return form_state
        
        return None
    
    def _ask_current_question(
        self,
        form_state: FormState,
        context: CapabilityContext
    ) -> CapabilityResponse:
        """Generate response asking the current question."""
        current_field = form_state.current_field
        if current_field is None:
            return CapabilityResponse(
                text="The form is complete!",
                confidence=1.0,
                handled=True,
            )
        
        question_text = self._format_question(current_field)
        
        # Add progress indicator
        progress = f"Question {form_state.current_index + 1} of {len(form_state.fields)}"
        
        return CapabilityResponse(
            text=f"{question_text} ({progress})",
            confidence=1.0,
            handled=True,
            metadata={
                "form_state": form_state,
                "current_field": current_field["name"],
                "progress": progress,
            },
        )
    
    def _format_question(self, field: dict[str, Any]) -> str:
        """Format a field as a question."""
        label = field["label"]
        field_type = field["type"]
        required = field.get("required", True)
        
        question = label
        if not question.endswith("?"):
            question += "?"
        
        # Add type-specific hints
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
    
    def _handle_back(self, form_state: FormState) -> CapabilityResponse:
        """Handle going back to previous question."""
        if form_state.go_back():
            current_field = form_state.current_field
            return CapabilityResponse(
                text=f"Okay, let's go back. {self._format_question(current_field)}",
                confidence=1.0,
                handled=True,
                metadata={"form_state": form_state, "went_back": True},
            )
        else:
            return CapabilityResponse(
                text="We're already at the first question. " + 
                     self._format_question(form_state.current_field),
                confidence=1.0,
                handled=True,
                metadata={"form_state": form_state},
            )
    
    async def _handle_completion(
        self,
        form_state: FormState,
        context: CapabilityContext
    ) -> CapabilityResponse:
        """Handle form completion and submission."""
        try:
            # Submit form to API
            client = await self._get_http_client()
            response = await client.post(
                f"{self._api_base_url}/api/internal/forms/{form_state.form_id}/submit",
                json={
                    "sessionId": context.session_id or "unknown",
                    "data": form_state.answers,
                },
            )
            
            if response.status_code == 201:
                logger.info(
                    "Form submitted successfully",
                    extra={
                        "form_id": form_state.form_id,
                        "session_id": context.session_id,
                    },
                )
                
                # Clear form state
                context.metadata.pop(FORM_STATE_KEY, None)
                context.metadata.pop(FORM_SCHEMA_KEY, None)
                
                return CapabilityResponse(
                    text="Thank you! Your form has been submitted successfully. "
                         "Is there anything else I can help you with?",
                    confidence=1.0,
                    handled=True,
                    metadata={"form_completed": True},
                )
            else:
                logger.error(
                    "Form submission failed",
                    extra={
                        "form_id": form_state.form_id,
                        "status_code": response.status_code,
                        "response": response.text,
                    },
                )
                return CapabilityResponse(
                    text="I'm sorry, there was an issue submitting your form. "
                         "Please try again later.",
                    confidence=0.5,
                    handled=True,
                    metadata={"form_submission_failed": True},
                )
                
        except Exception as e:
            logger.error(
                "Form submission error",
                extra={
                    "form_id": form_state.form_id,
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
            )
            return CapabilityResponse(
                text="I'm sorry, there was an issue submitting your form. "
                     "Please try again later.",
                confidence=0.5,
                handled=True,
                metadata={"error": str(e)},
            )
    
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
                f"{self._api_base_url}/api/internal/projects/{project_id}/active-form"
            )
            
            if response.status_code == 404:
                # No active form for this project
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
        """Extract and validate field value from user input.
        
        Uses simple pattern matching for MVP. Future: LLM function calling.
        
        Args:
            user_input: User's voice input
            field: Field schema
            
        Returns:
            Extracted value or None if couldn't extract
        """
        field_type = field["type"]
        user_input_clean = user_input.strip()
        
        # Handle skip for optional fields
        if not field.get("required", True):
            if any(word in user_input.lower() for word in ["skip", "pass", "next"]):
                return None
        
        # Type-specific extraction
        if field_type == "string" or field_type == "text":
            # Accept any non-empty string
            return user_input_clean if user_input_clean else None
        
        elif field_type == "email":
            # Simple email pattern matching
            import re
            # Email pattern - must have no spaces in the email itself
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            match = re.search(email_pattern, user_input)
            if match:
                email = match.group(0)
                # Verify no spaces within the matched email
                if ' ' in email:
                    return None
                return email
            return None
        
        elif field_type == "phone":
            # Extract digits (simple approach)
            import re
            digits = re.sub(r'\D', '', user_input)
            return digits if len(digits) >= 10 else None
        
        elif field_type == "number":
            # Extract first number
            import re
            match = re.search(r'-?\d+\.?\d*', user_input)
            if match:
                try:
                    num_str = match.group(0)
                    return float(num_str) if '.' in num_str else int(num_str)
                except ValueError:
                    return None
            return None
        
        elif field_type == "enum":
            # Match against options (case-insensitive)
            options = field.get("options", [])
            user_lower = user_input.lower()
            for option in options:
                if option.lower() in user_lower:
                    return option
            return None
        
        else:
            # Unknown type, accept as string
            return user_input_clean if user_input_clean else None
