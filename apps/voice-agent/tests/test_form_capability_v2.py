"""Tests for FormCapabilityV2.

Property Tests:
- Property 5: Trigger Phrase Activation
- Property 7: Confirmation State Machine
- Property 11: Summary Generation on Completion
- Property 12: Edit Without Restart
- Property 17: Validation Re-ask
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.capabilities.form_capability_v2 import (
    FormCapabilityV2,
    FormContext,
    FormStateEnum,
    FieldAnswer,
    FORM_STATE_KEY,
    AVAILABLE_FORMS_KEY,
)
from src.capabilities.base import CapabilityResponse
from src.capabilities.base import CapabilityContext


@pytest.fixture
def sample_form_schema():
    """Sample V2 form schema with trigger phrases."""
    return {
        "id": "form-123",
        "name": "Contact Form",
        "description": "Contact us form",
        "triggerPhrases": ["contact us", "get in touch", "reach out"],
        "greetingMessage": "I'd be happy to help you get in touch with us!",
        "completionMessage": "Thanks for reaching out! We'll get back to you soon.",
        "fields": [
            {"name": "name", "type": "string", "label": "What is your name", "required": True},
            {"name": "email", "type": "email", "label": "What is your email", "required": True},
            {"name": "message", "type": "text", "label": "What's your message", "required": True},
        ],
    }


@pytest.fixture
def sample_forms_list(sample_form_schema):
    """List of available forms."""
    return [
        sample_form_schema,
        {
            "id": "form-456",
            "name": "Support Form",
            "triggerPhrases": ["need help", "support"],
            "fields": [
                {"name": "issue", "type": "text", "label": "Describe your issue", "required": True},
            ],
        },
    ]


@pytest.fixture
def form_capability():
    """Create FormCapabilityV2 instance."""
    return FormCapabilityV2(api_base_url="http://localhost:3000")


@pytest.fixture
def context_without_form():
    """Create context without active form."""
    return CapabilityContext(
        user_query="Hello",
        project_id="proj-123",
        session_id="session-456",
        metadata={},
    )


@pytest.fixture
def context_with_form(sample_form_schema):
    """Create context with active form in COLLECTING state."""
    form_context = FormContext(schema=sample_form_schema)
    form_context.state = FormStateEnum.COLLECTING
    return CapabilityContext(
        user_query="John Doe",
        project_id="proj-123",
        session_id="session-456",
        metadata={FORM_STATE_KEY: form_context},
    )


class TestFormContext:
    """Tests for FormContext dataclass."""
    
    def test_initialization(self, sample_form_schema):
        """Test FormContext initialization."""
        ctx = FormContext(schema=sample_form_schema)
        
        assert ctx.form_id == "form-123"
        assert ctx.form_name == "Contact Form"
        assert len(ctx.fields) == 3
        assert ctx.current_field_index == 0
        assert ctx.state == FormStateEnum.INACTIVE
        assert ctx.answers == {}
    
    def test_current_field(self, sample_form_schema):
        """Test getting current field."""
        ctx = FormContext(schema=sample_form_schema)
        
        field = ctx.current_field
        assert field["name"] == "name"
        assert field["type"] == "string"
    
    def test_advance(self, sample_form_schema):
        """Test advancing to next field."""
        ctx = FormContext(schema=sample_form_schema)
        ctx.state = FormStateEnum.COLLECTING
        
        ctx.advance()
        
        assert ctx.current_field_index == 1
        assert ctx.current_field["name"] == "email"
        assert ctx.state == FormStateEnum.COLLECTING
    
    def test_advance_to_summary(self, sample_form_schema):
        """Test advancing past last field transitions to SUMMARY."""
        ctx = FormContext(schema=sample_form_schema)
        ctx.current_field_index = 2  # Last field
        
        ctx.advance()
        
        assert ctx.state == FormStateEnum.SUMMARY
        assert ctx.current_field is None
    
    def test_set_answer(self, sample_form_schema):
        """Test storing confirmed answer."""
        ctx = FormContext(schema=sample_form_schema)
        
        ctx.set_answer("name", "John Doe", source="voice")
        
        assert "name" in ctx.answers
        assert ctx.answers["name"].value == "John Doe"
        assert ctx.answers["name"].confirmed is True
        assert ctx.answers["name"].source == "voice"
    
    def test_get_confirmed_answers(self, sample_form_schema):
        """Test getting confirmed answers as dict."""
        ctx = FormContext(schema=sample_form_schema)
        ctx.set_answer("name", "John")
        ctx.set_answer("email", "john@test.com")
        
        answers = ctx.get_confirmed_answers()
        
        assert answers == {"name": "John", "email": "john@test.com"}
    
    def test_trigger_phrases(self, sample_form_schema):
        """Test accessing trigger phrases."""
        ctx = FormContext(schema=sample_form_schema)
        
        assert ctx.trigger_phrases == ["contact us", "get in touch", "reach out"]
    
    def test_greeting_message(self, sample_form_schema):
        """Test accessing greeting message."""
        ctx = FormContext(schema=sample_form_schema)
        
        assert "happy to help" in ctx.greeting_message


class TestFormCapabilityV2:
    """Tests for FormCapabilityV2 class."""
    
    def test_name(self, form_capability):
        """Test capability name."""
        assert form_capability.name == "form_v2"


class TestProperty5TriggerPhraseActivation:
    """Property 5: Trigger Phrase Activation
    
    For any user input matching a form's trigger phrases,
    that specific form shall be activated.
    """
    
    @pytest.mark.asyncio
    async def test_trigger_phrase_exact_match(self, form_capability, context_without_form, sample_forms_list):
        """Test exact trigger phrase match activates form."""
        context_without_form.user_query = "I want to contact us"
        context_without_form.metadata[AVAILABLE_FORMS_KEY] = sample_forms_list
        
        with patch.object(form_capability, '_get_available_forms', return_value=sample_forms_list):
            confidence = await form_capability.can_handle(context_without_form)
        
        assert confidence == 0.95
        assert "matched_form" in context_without_form.metadata
        assert context_without_form.metadata["matched_form"]["id"] == "form-123"
    
    @pytest.mark.asyncio
    async def test_trigger_phrase_case_insensitive(self, form_capability, context_without_form, sample_forms_list):
        """Test trigger phrase matching is case-insensitive."""
        context_without_form.user_query = "CONTACT US please"
        
        with patch.object(form_capability, '_get_available_forms', return_value=sample_forms_list):
            confidence = await form_capability.can_handle(context_without_form)
        
        assert confidence == 0.95
    
    @pytest.mark.asyncio
    async def test_different_form_trigger(self, form_capability, context_without_form, sample_forms_list):
        """Test different trigger phrase activates correct form."""
        context_without_form.user_query = "I need help with something"
        
        with patch.object(form_capability, '_get_available_forms', return_value=sample_forms_list):
            confidence = await form_capability.can_handle(context_without_form)
        
        assert confidence == 0.95
        assert context_without_form.metadata["matched_form"]["id"] == "form-456"
    
    @pytest.mark.asyncio
    async def test_no_trigger_match(self, form_capability, context_without_form, sample_forms_list):
        """Test no match returns 0.0 confidence."""
        context_without_form.user_query = "What's the weather like?"
        
        with patch.object(form_capability, '_get_available_forms', return_value=sample_forms_list):
            confidence = await form_capability.can_handle(context_without_form)
        
        assert confidence == 0.0
    
    @pytest.mark.asyncio
    async def test_active_form_always_handles(self, form_capability, context_with_form):
        """Test active form always returns 1.0 confidence."""
        context_with_form.user_query = "random text"
        
        confidence = await form_capability.can_handle(context_with_form)
        
        assert confidence == 1.0


class TestProperty7ConfirmationStateMachine:
    """Property 7: Confirmation State Machine
    
    For any voice-extracted value, the system shall transition through:
    COLLECTING → CONFIRMING → (COLLECTING if rejected, next field if confirmed)
    """
    
    @pytest.mark.asyncio
    async def test_collecting_to_confirming(self, form_capability, context_with_form):
        """Test COLLECTING → CONFIRMING on value extraction."""
        context_with_form.user_query = "My name is John Doe"
        form_context = context_with_form.metadata[FORM_STATE_KEY]
        form_context.state = FormStateEnum.COLLECTING
        
        response = await form_capability.handle(context_with_form)
        
        assert form_context.state == FormStateEnum.CONFIRMING
        assert form_context.pending_value == "My name is John Doe"
        assert "correct" in response.text.lower()
    
    @pytest.mark.asyncio
    async def test_confirming_yes_advances(self, form_capability, context_with_form):
        """Test confirmation advances to next field."""
        form_context = context_with_form.metadata[FORM_STATE_KEY]
        form_context.state = FormStateEnum.CONFIRMING
        form_context.pending_value = "John Doe"
        context_with_form.user_query = "yes"
        
        response = await form_capability.handle(context_with_form)
        
        assert form_context.state == FormStateEnum.COLLECTING
        assert form_context.current_field_index == 1
        assert form_context.answers["name"].value == "John Doe"
        assert form_context.answers["name"].confirmed is True
    
    @pytest.mark.asyncio
    async def test_confirming_no_returns_to_collecting(self, form_capability, context_with_form):
        """Test rejection returns to COLLECTING same field."""
        form_context = context_with_form.metadata[FORM_STATE_KEY]
        form_context.state = FormStateEnum.CONFIRMING
        form_context.pending_value = "John Doe"
        context_with_form.user_query = "no, that's wrong"
        
        response = await form_capability.handle(context_with_form)
        
        assert form_context.state == FormStateEnum.COLLECTING
        assert form_context.current_field_index == 0  # Same field
        assert form_context.pending_value is None
        assert "name" not in form_context.answers
    
    @pytest.mark.asyncio
    async def test_failed_extraction_asks_again(self, form_capability, sample_form_schema):
        """Test failed extraction asks for clarification."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.COLLECTING
        form_context.current_field_index = 1  # Email field
        
        context = CapabilityContext(
            user_query="not an email",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        response = await form_capability.handle(context)
        
        assert form_context.state == FormStateEnum.COLLECTING
        assert form_context.attempt_count == 1
        assert "didn't quite catch" in response.text.lower()


class TestProperty9KeyboardFallback:
    """Property 9: Extraction Fallback After Failures
    
    For any field where voice extraction fails 3 consecutive times,
    the system shall offer keyboard input as fallback.
    """
    
    @pytest.mark.asyncio
    async def test_keyboard_fallback_after_3_attempts(self, form_capability, sample_form_schema):
        """Test keyboard fallback offered after 3 failed attempts."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.COLLECTING
        form_context.current_field_index = 1  # Email field
        form_context.attempt_count = 2  # Already 2 failed attempts
        
        context = CapabilityContext(
            user_query="still not an email",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        response = await form_capability.handle(context)
        
        assert form_context.attempt_count == 3
        assert "type" in response.text.lower()
        assert response.metadata.get("keyboard_fallback") is True


class TestProperty11SummaryGeneration:
    """Property 11: Summary Generation on Completion
    
    For any form where all required fields are collected,
    the system shall transition to SUMMARY state before submission.
    """
    
    @pytest.mark.asyncio
    async def test_summary_after_last_field(self, form_capability, sample_form_schema):
        """Test summary shown after last field confirmed."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.CONFIRMING
        form_context.current_field_index = 2  # Last field
        form_context.pending_value = "Hello, I have a question"
        form_context.set_answer("name", "John")
        form_context.set_answer("email", "john@test.com")
        
        context = CapabilityContext(
            user_query="yes",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        response = await form_capability.handle(context)
        
        assert form_context.state == FormStateEnum.SUMMARY
        assert "summary" in response.text.lower()
        assert "John" in response.text
        assert "john@test.com" in response.text
    
    @pytest.mark.asyncio
    async def test_summary_approval_submits(self, form_capability, sample_form_schema):
        """Test approving summary transitions to SUBMITTING."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.SUMMARY
        form_context.set_answer("name", "John")
        form_context.set_answer("email", "john@test.com")
        form_context.set_answer("message", "Hello")
        
        context = CapabilityContext(
            user_query="yes, submit it",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        response = await form_capability.handle(context)
        
        assert form_context.state == FormStateEnum.SUBMITTING
        assert "submitting" in response.text.lower()


class TestProperty12EditWithoutRestart:
    """Property 12: Edit Without Restart
    
    For any edit request during summary, only the specified field
    shall be cleared; all other answers shall be preserved.
    """
    
    @pytest.mark.asyncio
    async def test_edit_specific_field(self, form_capability, sample_form_schema):
        """Test editing specific field preserves others."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.SUMMARY
        form_context.set_answer("name", "John")
        form_context.set_answer("email", "wrong@test.com")
        form_context.set_answer("message", "Hello")
        
        context = CapabilityContext(
            user_query="change my email",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        response = await form_capability.handle(context)
        
        assert form_context.state == FormStateEnum.COLLECTING
        assert form_context.current_field_index == 1  # Email field
        assert "email" not in form_context.answers  # Cleared
        assert form_context.answers["name"].value == "John"  # Preserved
        assert form_context.answers["message"].value == "Hello"  # Preserved


class TestProperty17ValidationReask:
    """Property 17: Validation Re-ask
    
    For any field value that fails validation, the system shall
    return to COLLECTING state for that field.
    """
    
    @pytest.mark.asyncio
    async def test_invalid_email_reasks(self, form_capability, sample_form_schema):
        """Test invalid email triggers re-ask."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.COLLECTING
        form_context.current_field_index = 1  # Email field
        
        context = CapabilityContext(
            user_query="my email is john at test dot com",  # Invalid format
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        response = await form_capability.handle(context)
        
        assert form_context.state == FormStateEnum.COLLECTING
        assert form_context.current_field_index == 1  # Still on email
        assert "email" not in form_context.answers


class TestFormSubmission:
    """Tests for form submission flow."""
    
    @pytest.mark.asyncio
    async def test_successful_submission(self, form_capability, sample_form_schema):
        """Test successful form submission."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.SUBMITTING
        form_context.set_answer("name", "John")
        form_context.set_answer("email", "john@test.com")
        form_context.set_answer("message", "Hello")
        
        context = CapabilityContext(
            user_query="",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"submission": {"id": "sub-123"}}
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        
        with patch.object(form_capability, '_get_http_client', return_value=mock_client):
            response = await form_capability.handle(context)
        
        assert form_context.state == FormStateEnum.COMPLETED
        assert "reaching out" in response.text.lower()  # Custom completion message
        assert response.metadata.get("form_completed") is True
    
    @pytest.mark.asyncio
    async def test_failed_submission_returns_to_summary(self, form_capability, sample_form_schema):
        """Test failed submission returns to SUMMARY for retry."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.SUBMITTING
        form_context.set_answer("name", "John")
        
        context = CapabilityContext(
            user_query="",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        
        with patch.object(form_capability, '_get_http_client', return_value=mock_client):
            response = await form_capability.handle(context)
        
        assert form_context.state == FormStateEnum.SUMMARY
        assert "issue" in response.text.lower()


class TestNavigationCommands:
    """Tests for navigation commands."""
    
    @pytest.mark.asyncio
    async def test_back_command(self, form_capability, sample_form_schema):
        """Test 'back' command goes to previous field."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.COLLECTING
        form_context.current_field_index = 1
        form_context.set_answer("name", "John")
        
        context = CapabilityContext(
            user_query="go back",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        response = await form_capability.handle(context)
        
        assert form_context.current_field_index == 0
        assert "name" not in form_context.answers  # Cleared
        assert "go back" in response.text.lower()
    
    @pytest.mark.asyncio
    async def test_cancel_command(self, form_capability, sample_form_schema):
        """Test 'cancel' command requests confirmation then abandons form."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.COLLECTING
        
        context = CapabilityContext(
            user_query="cancel",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        # First call requests confirmation
        response = await form_capability.handle(context)
        assert form_context.awaiting_abandonment_confirm is True
        assert "sure" in response.text.lower()
        
        # Second call with "yes" abandons
        context.user_query = "yes"
        response = await form_capability.handle(context)
        
        assert FORM_STATE_KEY not in context.metadata
        assert "cancelled" in response.text.lower()
        assert response.metadata.get("form_abandoned") is True


class TestFieldExtraction:
    """Tests for field value extraction."""
    
    @pytest.mark.asyncio
    async def test_extract_string(self, form_capability):
        """Test string extraction."""
        field = {"name": "name", "type": "string", "label": "Name", "required": True}
        value = await form_capability._extract_field_value("John Doe", field)
        assert value == "John Doe"
    
    @pytest.mark.asyncio
    async def test_extract_email(self, form_capability):
        """Test email extraction."""
        field = {"name": "email", "type": "email", "label": "Email", "required": True}
        value = await form_capability._extract_field_value("my email is john@example.com", field)
        assert value == "john@example.com"
    
    @pytest.mark.asyncio
    async def test_extract_phone(self, form_capability):
        """Test phone extraction."""
        field = {"name": "phone", "type": "phone", "label": "Phone", "required": True}
        value = await form_capability._extract_field_value("call me at 555-123-4567", field)
        assert value == "5551234567"
    
    @pytest.mark.asyncio
    async def test_extract_number(self, form_capability):
        """Test number extraction."""
        field = {"name": "age", "type": "number", "label": "Age", "required": True}
        value = await form_capability._extract_field_value("I am 25 years old", field)
        assert value == 25
    
    @pytest.mark.asyncio
    async def test_extract_enum(self, form_capability):
        """Test enum extraction."""
        field = {
            "name": "country",
            "type": "enum",
            "label": "Country",
            "required": True,
            "options": ["USA", "Canada", "Mexico"],
        }
        value = await form_capability._extract_field_value("I'm from Canada", field)
        assert value == "Canada"
    
    @pytest.mark.asyncio
    async def test_skip_optional_field(self, form_capability):
        """Test skipping optional field."""
        field = {"name": "phone", "type": "phone", "label": "Phone", "required": False}
        value = await form_capability._extract_field_value("skip", field)
        assert value == ""


class TestProperty18ModeTransitionContextPreservation:
    """Property 18: Mode Transition Context Preservation
    
    For any transition between form mode and RAG mode,
    conversation context and form state shall be preserved.
    
    Validates: Requirements 3.4, 8.2, 8.4, 8.5
    """
    
    @pytest.mark.asyncio
    async def test_pause_preserves_state(self, form_capability, sample_form_schema):
        """Test pausing form preserves all state (Requirement 8.2)."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.COLLECTING
        form_context.current_field_index = 1
        form_context.set_answer("name", "John")
        form_context.attempt_count = 2
        
        # Pause the form
        form_context.pause()
        
        assert form_context.state == FormStateEnum.PAUSED
        assert form_context.state_before_pause == FormStateEnum.COLLECTING
        assert form_context.current_field_index == 1  # Preserved
        assert form_context.answers["name"].value == "John"  # Preserved
        assert form_context.attempt_count == 2  # Preserved
        assert form_context.paused_for_rag is True
    
    @pytest.mark.asyncio
    async def test_resume_restores_state(self, form_capability, sample_form_schema):
        """Test resuming form restores to previous state (Requirement 8.5)."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.COLLECTING
        form_context.current_field_index = 1
        form_context.set_answer("name", "John")
        
        # Pause and resume
        form_context.pause()
        form_context.resume()
        
        assert form_context.state == FormStateEnum.COLLECTING
        assert form_context.state_before_pause is None
        assert form_context.current_field_index == 1  # Same field
        assert form_context.answers["name"].value == "John"  # Preserved
        assert form_context.paused_for_rag is False
    
    @pytest.mark.asyncio
    async def test_rag_question_pauses_form(self, form_capability, sample_form_schema):
        """Test unrelated question pauses form for RAG (Requirement 3.4)."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.COLLECTING
        form_context.current_field_index = 0
        
        context = CapabilityContext(
            user_query="What are your business hours?",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        response = await form_capability.handle(context)
        
        assert form_context.state == FormStateEnum.PAUSED
        assert response.handled is False  # Let RAG handle
        assert response.confidence == 0.0
        assert response.metadata.get("form_paused") is True
    
    @pytest.mark.asyncio
    async def test_resume_command_continues_form(self, form_capability, sample_form_schema):
        """Test 'continue' command resumes paused form (Requirement 8.5)."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.PAUSED
        form_context.state_before_pause = FormStateEnum.COLLECTING
        form_context.current_field_index = 1
        form_context.paused_for_rag = True
        form_context.set_answer("name", "John")
        
        context = CapabilityContext(
            user_query="continue the form",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        response = await form_capability.handle(context)
        
        assert form_context.state == FormStateEnum.COLLECTING
        assert form_context.current_field_index == 1  # Same field
        assert form_context.answers["name"].value == "John"  # Preserved
        assert response.metadata.get("form_resumed") is True
        assert "email" in response.text.lower()  # Asking for email field
    
    @pytest.mark.asyncio
    async def test_paused_form_low_confidence_for_rag(self, form_capability, sample_form_schema):
        """Test paused form returns low confidence for RAG questions."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.PAUSED
        form_context.state_before_pause = FormStateEnum.COLLECTING
        form_context.paused_for_rag = True
        
        context = CapabilityContext(
            user_query="What products do you sell?",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        confidence = await form_capability.can_handle(context)
        
        # Low confidence allows RAG to handle
        assert confidence == 0.3
    
    @pytest.mark.asyncio
    async def test_paused_form_high_confidence_for_resume(self, form_capability, sample_form_schema):
        """Test paused form returns high confidence for resume commands."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.PAUSED
        form_context.state_before_pause = FormStateEnum.COLLECTING
        
        context = CapabilityContext(
            user_query="continue",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        confidence = await form_capability.can_handle(context)
        
        assert confidence == 1.0
    
    @pytest.mark.asyncio
    async def test_confirming_state_can_pause(self, form_capability, sample_form_schema):
        """Test CONFIRMING state can also pause for RAG."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.CONFIRMING
        form_context.pending_value = "John"
        form_context.current_field_index = 0
        
        context = CapabilityContext(
            user_query="How much does shipping cost?",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        response = await form_capability.handle(context)
        
        assert form_context.state == FormStateEnum.PAUSED
        assert form_context.state_before_pause == FormStateEnum.CONFIRMING
        assert form_context.pending_value == "John"  # Preserved


class TestAbandonmentConfirmation:
    """Tests for abandonment confirmation flow.
    
    Requirement 8.3: Confirm abandonment, transition to RAG mode.
    """
    
    @pytest.mark.asyncio
    async def test_cancel_requests_confirmation(self, form_capability, sample_form_schema):
        """Test cancel command requests confirmation."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.COLLECTING
        form_context.set_answer("name", "John")
        
        context = CapabilityContext(
            user_query="cancel",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        response = await form_capability.handle(context)
        
        assert form_context.awaiting_abandonment_confirm is True
        assert "sure" in response.text.lower()
        assert FORM_STATE_KEY in context.metadata  # Not abandoned yet
    
    @pytest.mark.asyncio
    async def test_confirm_abandonment_clears_form(self, form_capability, sample_form_schema):
        """Test confirming abandonment clears form state."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.COLLECTING
        form_context.awaiting_abandonment_confirm = True
        form_context.set_answer("name", "John")
        
        context = CapabilityContext(
            user_query="yes",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        response = await form_capability.handle(context)
        
        assert FORM_STATE_KEY not in context.metadata
        assert response.metadata.get("form_abandoned") is True
    
    @pytest.mark.asyncio
    async def test_decline_abandonment_continues(self, form_capability, sample_form_schema):
        """Test declining abandonment continues form."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.COLLECTING
        form_context.awaiting_abandonment_confirm = True
        form_context.current_field_index = 0
        
        context = CapabilityContext(
            user_query="no",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        response = await form_capability.handle(context)
        
        assert form_context.awaiting_abandonment_confirm is False
        assert FORM_STATE_KEY in context.metadata
        assert response.metadata.get("abandonment_cancelled") is True
        assert "name" in response.text.lower()  # Continues with current field


class TestPostCompletionTransition:
    """Tests for post-completion transition to RAG mode.
    
    Requirement 8.1: After form completion, transition to RAG mode.
    """
    
    @pytest.mark.asyncio
    async def test_completed_state_clears_form(self, form_capability, sample_form_schema):
        """Test COMPLETED state clears form and transitions to RAG."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.COMPLETED
        
        context = CapabilityContext(
            user_query="anything",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
        response = await form_capability.handle(context)
        
        assert FORM_STATE_KEY not in context.metadata
        assert "anything else" in response.text.lower()


class TestProperty4MultiFormAvailability:
    """Property 4: Multi-Form Availability
    
    For any project with N forms, all N forms shall be available
    to the agent as selectable tools.
    
    Validates: Requirements 2.1, 2.3, 2.5
    """
    
    @pytest.fixture
    def multi_form_list(self):
        """Create list of multiple forms with different trigger phrases."""
        return [
            {
                "id": "form-contact",
                "name": "Contact Form",
                "triggerPhrases": ["contact us", "get in touch"],
                "fields": [{"name": "email", "type": "email", "label": "Email", "required": True}],
            },
            {
                "id": "form-support",
                "name": "Support Form",
                "triggerPhrases": ["need help", "support request"],
                "fields": [{"name": "issue", "type": "text", "label": "Issue", "required": True}],
            },
            {
                "id": "form-feedback",
                "name": "Feedback Form",
                "triggerPhrases": ["give feedback", "leave feedback"],
                "fields": [{"name": "feedback", "type": "text", "label": "Feedback", "required": True}],
            },
        ]
    
    @pytest.mark.asyncio
    async def test_all_forms_available_to_agent(self, form_capability, multi_form_list):
        """Test all N forms are available to agent (Requirement 2.1)."""
        context = CapabilityContext(
            user_query="I want to contact us",
            project_id="proj-123",
            session_id="session-456",
            metadata={},
        )
        
        with patch.object(form_capability, '_get_available_forms', return_value=multi_form_list):
            confidence = await form_capability.can_handle(context)
        
        # Should match contact form
        assert confidence == 0.95
        assert context.metadata.get("matched_form", {}).get("id") == "form-contact"
    
    @pytest.mark.asyncio
    async def test_each_form_activatable_by_trigger(self, form_capability, multi_form_list):
        """Test each form can be activated by its trigger phrase (Requirement 2.1)."""
        test_cases = [
            ("contact us please", "form-contact"),
            ("I need help with something", "form-support"),
            ("I want to give feedback", "form-feedback"),
        ]
        
        for query, expected_form_id in test_cases:
            context = CapabilityContext(
                user_query=query,
                project_id="proj-123",
                session_id="session-456",
                metadata={},
            )
            
            with patch.object(form_capability, '_get_available_forms', return_value=multi_form_list):
                confidence = await form_capability.can_handle(context)
            
            assert confidence == 0.95, f"Failed for query: {query}"
            assert context.metadata.get("matched_form", {}).get("id") == expected_form_id, \
                f"Wrong form for query: {query}"
    
    @pytest.mark.asyncio
    async def test_multiple_forms_match_asks_user(self, form_capability):
        """Test when multiple forms match, agent asks user to choose (Requirement 2.5)."""
        # Forms with overlapping trigger phrases
        overlapping_forms = [
            {
                "id": "form-1",
                "name": "Sales Contact",
                "triggerPhrases": ["contact sales", "talk to sales"],
                "fields": [{"name": "email", "type": "email", "label": "Email", "required": True}],
            },
            {
                "id": "form-2",
                "name": "Support Contact",
                "triggerPhrases": ["contact support", "talk to support"],
                "fields": [{"name": "issue", "type": "text", "label": "Issue", "required": True}],
            },
        ]
        
        # Query that matches both "contact" forms
        context = CapabilityContext(
            user_query="I want to contact sales and also contact support",
            project_id="proj-123",
            session_id="session-456",
            metadata={},
        )
        
        with patch.object(form_capability, '_get_available_forms', return_value=overlapping_forms):
            confidence = await form_capability.can_handle(context)
        
        # Should detect multiple matches
        assert confidence == 0.9
        assert context.metadata.get("awaiting_form_selection") is True
        assert len(context.metadata.get("matching_forms", [])) == 2
    
    @pytest.mark.asyncio
    async def test_form_selection_prompt_generated(self, form_capability):
        """Test selection prompt is generated for multiple matches (Requirement 2.5)."""
        matching_forms = [
            {"id": "form-1", "name": "Sales Form", "fields": []},
            {"id": "form-2", "name": "Support Form", "fields": []},
        ]
        
        context = CapabilityContext(
            user_query="I need help",
            project_id="proj-123",
            session_id="session-456",
            metadata={
                "awaiting_form_selection": True,
                "matching_forms": matching_forms,
            },
        )
        
        response = await form_capability.handle(context)
        
        assert "Sales Form" in response.text or "Support Form" in response.text
        assert "which" in response.text.lower()
    
    @pytest.mark.asyncio
    async def test_user_selects_form_by_name(self, form_capability):
        """Test user can select form by saying its name (Requirement 2.5)."""
        matching_forms = [
            {
                "id": "form-sales",
                "name": "Sales Form",
                "greetingMessage": "Let me help you with sales!",
                "fields": [{"name": "email", "type": "email", "label": "Email", "required": True}],
            },
            {
                "id": "form-support",
                "name": "Support Form",
                "fields": [{"name": "issue", "type": "text", "label": "Issue", "required": True}],
            },
        ]
        
        context = CapabilityContext(
            user_query="I want the Sales Form",
            project_id="proj-123",
            session_id="session-456",
            metadata={
                "awaiting_form_selection": True,
                "matching_forms": matching_forms,
                "selection_prompt_sent": True,
            },
        )
        
        response = await form_capability.handle(context)
        
        # Should activate the selected form
        assert context.metadata.get("awaiting_form_selection") is None
        assert FORM_STATE_KEY in context.metadata
        form_context = context.metadata[FORM_STATE_KEY]
        assert form_context.form_id == "form-sales"
        assert "sales" in response.text.lower()
    
    @pytest.mark.asyncio
    async def test_unclear_selection_asks_again(self, form_capability):
        """Test unclear selection prompts user again (Requirement 2.5)."""
        matching_forms = [
            {"id": "form-1", "name": "Contact Form", "fields": []},
            {"id": "form-2", "name": "Feedback Form", "fields": []},
        ]
        
        context = CapabilityContext(
            user_query="the first one",  # Unclear selection
            project_id="proj-123",
            session_id="session-456",
            metadata={
                "awaiting_form_selection": True,
                "matching_forms": matching_forms,
                "selection_prompt_sent": True,
            },
        )
        
        response = await form_capability.handle(context)
        
        # Should ask again
        assert context.metadata.get("awaiting_form_selection") is True
        assert "Contact Form" in response.text or "Feedback Form" in response.text
    
    @pytest.mark.asyncio
    async def test_no_match_returns_zero_confidence(self, form_capability, multi_form_list):
        """Test no trigger match returns 0.0 confidence (Requirement 2.3)."""
        context = CapabilityContext(
            user_query="What's the weather like today?",
            project_id="proj-123",
            session_id="session-456",
            metadata={},
        )
        
        with patch.object(form_capability, '_get_available_forms', return_value=multi_form_list):
            confidence = await form_capability.can_handle(context)
        
        assert confidence == 0.0
        assert "matched_form" not in context.metadata
    
    @pytest.mark.asyncio
    async def test_empty_forms_list_returns_zero(self, form_capability):
        """Test empty forms list returns 0.0 confidence."""
        context = CapabilityContext(
            user_query="contact us",
            project_id="proj-123",
            session_id="session-456",
            metadata={},
        )
        
        with patch.object(form_capability, '_get_available_forms', return_value=[]):
            confidence = await form_capability.can_handle(context)
        
        assert confidence == 0.0


class TestFormSelectionHelpers:
    """Tests for form selection helper methods."""
    
    def test_find_all_matching_forms_single(self, form_capability):
        """Test finding single matching form."""
        forms = [
            {"id": "f1", "name": "Form 1", "triggerPhrases": ["contact us"]},
            {"id": "f2", "name": "Form 2", "triggerPhrases": ["need help"]},
        ]
        
        matches = form_capability._find_all_matching_forms("I want to contact us", forms)
        
        assert len(matches) == 1
        assert matches[0]["id"] == "f1"
    
    def test_find_all_matching_forms_multiple(self, form_capability):
        """Test finding multiple matching forms."""
        forms = [
            {"id": "f1", "name": "Form 1", "triggerPhrases": ["contact"]},
            {"id": "f2", "name": "Form 2", "triggerPhrases": ["contact"]},
        ]
        
        matches = form_capability._find_all_matching_forms("I want to contact someone", forms)
        
        assert len(matches) == 2
    
    def test_find_all_matching_forms_none(self, form_capability):
        """Test finding no matching forms."""
        forms = [
            {"id": "f1", "name": "Form 1", "triggerPhrases": ["contact us"]},
        ]
        
        matches = form_capability._find_all_matching_forms("hello world", forms)
        
        assert len(matches) == 0
    
    def test_generate_form_selection_prompt_two_forms(self, form_capability):
        """Test selection prompt for two forms."""
        forms = [
            {"name": "Sales Form"},
            {"name": "Support Form"},
        ]
        
        prompt = form_capability._generate_form_selection_prompt(forms)
        
        assert "Sales Form" in prompt
        assert "Support Form" in prompt
        assert "which" in prompt.lower()
    
    def test_generate_form_selection_prompt_three_forms(self, form_capability):
        """Test selection prompt for three forms."""
        forms = [
            {"name": "Form A"},
            {"name": "Form B"},
            {"name": "Form C"},
        ]
        
        prompt = form_capability._generate_form_selection_prompt(forms)
        
        assert "Form A" in prompt
        assert "Form B" in prompt
        assert "Form C" in prompt
    
    def test_generate_available_forms_prompt_single(self, form_capability):
        """Test available forms prompt for single form."""
        forms = [{"name": "Contact Form"}]
        
        prompt = form_capability._generate_available_forms_prompt(forms)
        
        assert "Contact Form" in prompt
    
    def test_generate_available_forms_prompt_multiple(self, form_capability):
        """Test available forms prompt for multiple forms."""
        forms = [
            {"name": "Form A"},
            {"name": "Form B"},
            {"name": "Form C"},
        ]
        
        prompt = form_capability._generate_available_forms_prompt(forms)
        
        assert "Form A" in prompt
        assert "Form B" in prompt
        assert "Form C" in prompt
    
    def test_generate_available_forms_prompt_empty(self, form_capability):
        """Test available forms prompt for empty list."""
        prompt = form_capability._generate_available_forms_prompt([])
        
        assert prompt == ""
