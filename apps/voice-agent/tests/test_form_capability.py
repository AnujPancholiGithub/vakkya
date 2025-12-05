"""Tests for FormCapability."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx

from src.capabilities.form_capability import FormCapability, FormState, FORM_STATE_KEY, FORM_SCHEMA_KEY
from src.capabilities.base import CapabilityContext


@pytest.fixture
def sample_form_schema():
    """Sample form schema for testing."""
    return {
        "id": "form-123",
        "name": "Contact Form",
        "fields": [
            {"name": "name", "type": "string", "label": "What is your name", "required": True},
            {"name": "email", "type": "email", "label": "What is your email", "required": True},
            {"name": "phone", "type": "phone", "label": "What is your phone number", "required": False},
        ],
    }


@pytest.fixture
def form_capability():
    """Create FormCapability instance."""
    return FormCapability(api_base_url="http://localhost:3000")


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
    """Create context with active form."""
    form_state = FormState(sample_form_schema)
    return CapabilityContext(
        user_query="John Doe",
        project_id="proj-123",
        session_id="session-456",
        metadata={
            FORM_STATE_KEY: form_state,
            FORM_SCHEMA_KEY: sample_form_schema,
        },
    )


class TestFormState:
    """Tests for FormState class."""
    
    def test_initialization(self, sample_form_schema):
        """Test FormState initialization."""
        state = FormState(sample_form_schema)
        
        assert state.form_id == "form-123"
        assert state.form_name == "Contact Form"
        assert len(state.fields) == 3
        assert state.current_index == 0
        assert state.answers == {}
        assert state.completed is False
    
    def test_current_field(self, sample_form_schema):
        """Test getting current field."""
        state = FormState(sample_form_schema)
        
        field = state.current_field
        assert field is not None
        assert field["name"] == "name"
        assert field["type"] == "string"
    
    def test_advance(self, sample_form_schema):
        """Test advancing to next field."""
        state = FormState(sample_form_schema)
        
        assert state.current_index == 0
        state.advance()
        assert state.current_index == 1
        assert state.current_field["name"] == "email"
        assert state.completed is False
    
    def test_advance_to_completion(self, sample_form_schema):
        """Test advancing past last field marks as completed."""
        state = FormState(sample_form_schema)
        
        state.advance()  # to email
        state.advance()  # to phone
        state.advance()  # past end
        
        assert state.completed is True
        assert state.current_field is None
    
    def test_go_back(self, sample_form_schema):
        """Test going back to previous field."""
        state = FormState(sample_form_schema)
        state.advance()  # to email
        
        result = state.go_back()
        assert result is True
        assert state.current_index == 0
        assert state.current_field["name"] == "name"
    
    def test_go_back_at_start(self, sample_form_schema):
        """Test going back at first field."""
        state = FormState(sample_form_schema)
        
        result = state.go_back()
        assert result is False
        assert state.current_index == 0
    
    def test_set_answer(self, sample_form_schema):
        """Test storing answers."""
        state = FormState(sample_form_schema)
        
        state.set_answer("name", "John Doe")
        state.set_answer("email", "john@example.com")
        
        assert state.answers["name"] == "John Doe"
        assert state.answers["email"] == "john@example.com"


class TestFormCapability:
    """Tests for FormCapability class."""
    
    def test_name(self, form_capability):
        """Test capability name."""
        assert form_capability.name == "form"
    
    @pytest.mark.asyncio
    async def test_can_handle_with_active_form(self, form_capability, context_with_form):
        """Test can_handle returns 1.0 when form is active."""
        confidence = await form_capability.can_handle(context_with_form)
        assert confidence == 1.0
    
    @pytest.mark.asyncio
    async def test_can_handle_without_form(self, form_capability, context_without_form):
        """Test can_handle returns 0.0 when no form is active."""
        with patch.object(form_capability, '_fetch_active_form', return_value=None):
            confidence = await form_capability.can_handle(context_without_form)
            assert confidence == 0.0
    
    @pytest.mark.asyncio
    async def test_can_handle_with_available_form(self, form_capability, context_without_form, sample_form_schema):
        """Test can_handle returns 0.9 when form is available."""
        with patch.object(form_capability, '_fetch_active_form', return_value=sample_form_schema):
            confidence = await form_capability.can_handle(context_without_form)
            assert confidence == 0.9
            assert FORM_SCHEMA_KEY in context_without_form.metadata
    
    @pytest.mark.asyncio
    async def test_handle_asks_first_question(self, form_capability, sample_form_schema):
        """Test handle asks first question when form starts."""
        context = CapabilityContext(
            user_query="start form",
            project_id="proj-123",
            session_id="session-456",
            metadata={FORM_SCHEMA_KEY: sample_form_schema},
        )
        
        response = await form_capability.handle(context)
        
        assert response.handled is True
        assert response.confidence == 1.0
        assert "What is your name" in response.text
        assert "Question 1 of 3" in response.text
    
    @pytest.mark.asyncio
    async def test_handle_extracts_string_value(self, form_capability, context_with_form):
        """Test handle extracts string value and advances."""
        context_with_form.user_query = "John Doe"
        
        response = await form_capability.handle(context_with_form)
        
        form_state = context_with_form.metadata[FORM_STATE_KEY]
        assert form_state.answers["name"] == "John Doe"
        assert form_state.current_index == 1
        assert "email" in response.text.lower()
    
    @pytest.mark.asyncio
    async def test_handle_extracts_email_value(self, form_capability, sample_form_schema):
        """Test handle extracts email from input."""
        form_state = FormState(sample_form_schema)
        form_state.advance()  # Move to email field
        
        context = CapabilityContext(
            user_query="My email is john@example.com",
            project_id="proj-123",
            session_id="session-456",
            metadata={
                FORM_STATE_KEY: form_state,
                FORM_SCHEMA_KEY: sample_form_schema,
            },
        )
        
        response = await form_capability.handle(context)
        
        assert form_state.answers["email"] == "john@example.com"
        assert form_state.current_index == 2
    
    @pytest.mark.asyncio
    async def test_handle_extracts_phone_value(self, form_capability, sample_form_schema):
        """Test handle extracts phone number."""
        form_state = FormState(sample_form_schema)
        form_state.advance()  # email
        form_state.advance()  # phone
        
        context = CapabilityContext(
            user_query="My number is 555-123-4567",
            project_id="proj-123",
            session_id="session-456",
            metadata={
                FORM_STATE_KEY: form_state,
                FORM_SCHEMA_KEY: sample_form_schema,
            },
        )
        
        response = await form_capability.handle(context)
        
        assert form_state.answers["phone"] == "5551234567"
    
    @pytest.mark.asyncio
    async def test_handle_back_command(self, form_capability, sample_form_schema):
        """Test handle processes 'back' command."""
        form_state = FormState(sample_form_schema)
        form_state.advance()  # Move to email field
        
        context = CapabilityContext(
            user_query="go back",
            project_id="proj-123",
            session_id="session-456",
            metadata={
                FORM_STATE_KEY: form_state,
                FORM_SCHEMA_KEY: sample_form_schema,
            },
        )
        
        response = await form_capability.handle(context)
        
        assert form_state.current_index == 0
        assert "go back" in response.text.lower()
        assert "name" in response.text.lower()
    
    @pytest.mark.asyncio
    async def test_handle_clarification_on_invalid_input(self, form_capability, sample_form_schema):
        """Test handle asks for clarification on invalid input."""
        form_state = FormState(sample_form_schema)
        form_state.advance()  # Move to email field
        
        context = CapabilityContext(
            user_query="not an email",
            project_id="proj-123",
            session_id="session-456",
            metadata={
                FORM_STATE_KEY: form_state,
                FORM_SCHEMA_KEY: sample_form_schema,
            },
        )
        
        response = await form_capability.handle(context)
        
        assert "didn't quite catch" in response.text.lower()
        assert form_state.current_index == 1  # Didn't advance
    
    @pytest.mark.asyncio
    async def test_handle_completion_submits_form(self, form_capability, sample_form_schema):
        """Test handle submits form on completion."""
        form_state = FormState(sample_form_schema)
        form_state.set_answer("name", "John Doe")
        form_state.set_answer("email", "john@example.com")
        form_state.set_answer("phone", "5551234567")
        form_state.current_index = 3  # Past last field
        form_state.completed = True
        
        context = CapabilityContext(
            user_query="",
            project_id="proj-123",
            session_id="session-456",
            metadata={
                FORM_STATE_KEY: form_state,
                FORM_SCHEMA_KEY: sample_form_schema,
            },
        )
        
        # Mock HTTP client
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        
        with patch.object(form_capability, '_get_http_client', return_value=mock_client):
            response = await form_capability.handle(context)
        
        assert "submitted successfully" in response.text.lower()
        assert response.metadata.get("form_completed") is True
        assert FORM_STATE_KEY not in context.metadata
        
        # Verify API call
        mock_client.post.assert_called_once()
        call_args = mock_client.post.call_args
        assert "/internal/forms/form-123/submit" in call_args[0][0]
        assert call_args[1]["json"]["sessionId"] == "session-456"
        assert call_args[1]["json"]["data"] == form_state.answers
    
    @pytest.mark.asyncio
    async def test_extract_field_value_string(self, form_capability):
        """Test extracting string field value."""
        field = {"name": "name", "type": "string", "label": "Name", "required": True}
        value = await form_capability._extract_field_value("John Doe", field)
        assert value == "John Doe"
    
    @pytest.mark.asyncio
    async def test_extract_field_value_email(self, form_capability):
        """Test extracting email field value."""
        field = {"name": "email", "type": "email", "label": "Email", "required": True}
        value = await form_capability._extract_field_value("Contact me at john@example.com", field)
        assert value == "john@example.com"
    
    @pytest.mark.asyncio
    async def test_extract_field_value_phone(self, form_capability):
        """Test extracting phone field value."""
        field = {"name": "phone", "type": "phone", "label": "Phone", "required": True}
        value = await form_capability._extract_field_value("Call me at (555) 123-4567", field)
        assert value == "5551234567"
    
    @pytest.mark.asyncio
    async def test_extract_field_value_number(self, form_capability):
        """Test extracting number field value."""
        field = {"name": "age", "type": "number", "label": "Age", "required": True}
        value = await form_capability._extract_field_value("I am 25 years old", field)
        assert value == 25
    
    @pytest.mark.asyncio
    async def test_extract_field_value_enum(self, form_capability):
        """Test extracting enum field value."""
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
    async def test_extract_field_value_skip_optional(self, form_capability):
        """Test skipping optional field."""
        field = {"name": "phone", "type": "phone", "label": "Phone", "required": False}
        value = await form_capability._extract_field_value("skip", field)
        assert value is None
    
    @pytest.mark.asyncio
    async def test_extract_field_value_invalid_email(self, form_capability):
        """Test extracting invalid email returns None."""
        field = {"name": "email", "type": "email", "label": "Email", "required": True}
        value = await form_capability._extract_field_value("not an email", field)
        assert value is None
    
    def test_format_question_basic(self, form_capability):
        """Test formatting basic question."""
        field = {"name": "name", "type": "string", "label": "What is your name", "required": True}
        question = form_capability._format_question(field)
        assert "What is your name?" in question
    
    def test_format_question_email(self, form_capability):
        """Test formatting email question."""
        field = {"name": "email", "type": "email", "label": "Your email", "required": True}
        question = form_capability._format_question(field)
        assert "Your email?" in question
        assert "email address" in question.lower()
    
    def test_format_question_enum(self, form_capability):
        """Test formatting enum question with options."""
        field = {
            "name": "country",
            "type": "enum",
            "label": "Country",
            "required": True,
            "options": ["USA", "Canada", "Mexico"],
        }
        question = form_capability._format_question(field)
        assert "Country?" in question
        assert "USA" in question
        assert "Canada" in question
        assert "Mexico" in question
    
    def test_format_question_optional(self, form_capability):
        """Test formatting optional question."""
        field = {"name": "phone", "type": "phone", "label": "Phone", "required": False}
        question = form_capability._format_question(field)
        assert "Optional" in question
        assert "skip" in question.lower()


class TestPropertyTests:
    """Property-based tests for field extraction."""
    
    @pytest.mark.asyncio
    async def test_property_4_field_extraction_preserves_type(self, form_capability):
        """Property 4: For any field type, extracted value matches expected type or is None."""
        test_cases = [
            # (field, input, expected_type_or_none)
            ({"name": "name", "type": "string", "label": "Name", "required": True}, "John", str),
            ({"name": "email", "type": "email", "label": "Email", "required": True}, "test@example.com", str),
            ({"name": "phone", "type": "phone", "label": "Phone", "required": True}, "5551234567", str),
            ({"name": "age", "type": "number", "label": "Age", "required": True}, "25", int),
            ({"name": "price", "type": "number", "label": "Price", "required": True}, "19.99", float),
            ({"name": "country", "type": "enum", "label": "Country", "required": True, "options": ["USA"]}, "USA", str),
            # Invalid inputs should return None
            ({"name": "email", "type": "email", "label": "Email", "required": True}, "not-email", type(None)),
            ({"name": "phone", "type": "phone", "label": "Phone", "required": True}, "abc", type(None)),
        ]
        
        for field, user_input, expected_type in test_cases:
            value = await form_capability._extract_field_value(user_input, field)
            assert value is None or isinstance(value, expected_type), \
                f"Field {field['name']} with input '{user_input}' returned {type(value)}, expected {expected_type}"
    
    @pytest.mark.asyncio
    async def test_property_4_required_fields_reject_empty(self, form_capability):
        """Property 4: Required fields reject empty input."""
        field = {"name": "name", "type": "string", "label": "Name", "required": True}
        value = await form_capability._extract_field_value("", field)
        assert value is None
    
    @pytest.mark.asyncio
    async def test_property_4_optional_fields_accept_skip(self, form_capability):
        """Property 4: Optional fields accept skip commands."""
        field = {"name": "phone", "type": "phone", "label": "Phone", "required": False}
        
        skip_commands = ["skip", "pass", "next"]
        for cmd in skip_commands:
            value = await form_capability._extract_field_value(cmd, field)
            assert value is None, f"Optional field should accept '{cmd}' as skip"
    
    @pytest.mark.asyncio
    async def test_property_4_email_validation(self, form_capability):
        """Property 4: Email fields validate format."""
        field = {"name": "email", "type": "email", "label": "Email", "required": True}
        
        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk",
            "first+last@company.org",
        ]
        
        for email in valid_emails:
            value = await form_capability._extract_field_value(email, field)
            assert value is not None, f"Valid email '{email}' should be extracted"
            assert "@" in value
        
        invalid_emails = [
            "not-an-email",
            "@example.com",
            "user@",
        ]
        
        for email in invalid_emails:
            value = await form_capability._extract_field_value(email, field)
            assert value is None, f"Invalid email '{email}' should return None"
    
    @pytest.mark.asyncio
    async def test_property_4_enum_case_insensitive(self, form_capability):
        """Property 4: Enum fields match case-insensitively."""
        field = {
            "name": "country",
            "type": "enum",
            "label": "Country",
            "required": True,
            "options": ["USA", "Canada", "Mexico"],
        }
        
        test_inputs = [
            ("I'm from usa", "USA"),
            ("CANADA please", "Canada"),
            ("mexico", "Mexico"),
        ]
        
        for user_input, expected in test_inputs:
            value = await form_capability._extract_field_value(user_input, field)
            assert value == expected, f"Input '{user_input}' should match '{expected}'"
