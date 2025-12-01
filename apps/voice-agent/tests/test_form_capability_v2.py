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
        """Test 'cancel' command abandons form."""
        form_context = FormContext(schema=sample_form_schema)
        form_context.state = FormStateEnum.COLLECTING
        
        context = CapabilityContext(
            user_query="cancel",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_STATE_KEY: form_context},
        )
        
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
