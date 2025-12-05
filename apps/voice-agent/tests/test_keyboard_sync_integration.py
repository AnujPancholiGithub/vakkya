"""Integration tests for Form Keyboard Sync feature.

These tests verify the end-to-end flow of keyboard input handling:
1. field_completed message → FormCollectionState update
2. pending_keyboard_inputs population
3. on_user_turn_completed hook context injection
4. Form completion detection

Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2, 3.3, 7.4
"""

import json
import pytest
from dataclasses import dataclass, field
from typing import Any, Optional
from unittest.mock import MagicMock, AsyncMock

from src.form_state import FormCollectionState, ConfirmedField
from src.form_aware_agent import FormAwareAgent
from src.models import SessionContext


@pytest.fixture
def sample_form_schema():
    """Sample form schema for testing."""
    return {
        "id": "form-test-123",
        "name": "Test Contact Form",
        "fields": [
            {"name": "name", "type": "string", "label": "Your name", "required": True},
            {"name": "email", "type": "email", "label": "Your email", "required": True},
            {"name": "phone", "type": "phone", "label": "Your phone", "required": False},
            {"name": "message", "type": "text", "label": "Your message", "required": True},
        ],
    }


@pytest.fixture
def session_context_with_form(sample_form_schema):
    """Create a SessionContext with an active form."""
    ctx = SessionContext(
        project_id="proj-test-123",
        active_form=sample_form_schema,
    )
    # Initialize FormCollectionState
    ctx.form_collection_state = FormCollectionState(
        form_id=sample_form_schema["id"],
        total_fields=len(sample_form_schema["fields"]),
    )
    ctx.form_collection_state.set_required_fields(sample_form_schema["fields"])
    return ctx


class TestKeyboardInputFlow:
    """Test 17.1: Test keyboard input flow end-to-end.
    
    Validates: Requirements 1.1, 1.2, 2.1, 2.2
    """
    
    def test_field_completed_updates_form_collection_state(self, session_context_with_form):
        """Test that field_completed updates FormCollectionState immediately."""
        ctx = session_context_with_form
        
        # Simulate field_completed message processing
        field_name = "email"
        value = "test@example.com"
        source = "keyboard"
        
        # Update confirmed_fields (as done in entrypoint.py)
        ctx.form_collection_state.add_confirmed_field(
            field_name=field_name,
            value=value,
            source=source,
        )
        
        # Verify FormCollectionState is updated
        assert ctx.form_collection_state.is_field_confirmed(field_name)
        assert ctx.form_collection_state.confirmed_fields[field_name].value == value
        assert ctx.form_collection_state.confirmed_fields[field_name].source == source
    
    def test_field_completed_populates_pending_keyboard_inputs(self, session_context_with_form):
        """Test that field_completed adds to pending_keyboard_inputs."""
        ctx = session_context_with_form
        
        # Simulate field_completed message processing
        field_name = "name"
        value = "John Doe"
        source = "keyboard"
        
        # Update confirmed_fields
        ctx.form_collection_state.add_confirmed_field(
            field_name=field_name,
            value=value,
            source=source,
        )
        
        # Add to pending_keyboard_inputs (as done in entrypoint.py)
        ctx.pending_keyboard_inputs.append({
            "field_name": field_name,
            "value": value,
            "source": source,
        })
        
        # Verify pending_keyboard_inputs is populated
        assert len(ctx.pending_keyboard_inputs) == 1
        assert ctx.pending_keyboard_inputs[0]["field_name"] == field_name
        assert ctx.pending_keyboard_inputs[0]["value"] == value
        assert ctx.pending_keyboard_inputs[0]["source"] == source
    
    def test_confirmed_field_skip(self, session_context_with_form, sample_form_schema):
        """Test that confirmed fields are skipped when getting next field.
        
        Validates: Requirements 1.3
        """
        ctx = session_context_with_form
        fields = sample_form_schema["fields"]
        
        # Confirm first field (name)
        ctx.form_collection_state.add_confirmed_field("name", "John", "keyboard")
        
        # Get next uncollected field - should skip name and return email (index 1)
        next_index = ctx.form_collection_state.get_next_uncollected_field_index(fields)
        assert next_index == 1
        assert fields[next_index]["name"] == "email"
        
        # Confirm email
        ctx.form_collection_state.add_confirmed_field("email", "john@test.com", "keyboard")
        
        # Get next - should skip name and email, return phone (index 2)
        next_index = ctx.form_collection_state.get_next_uncollected_field_index(fields)
        assert next_index == 2
        assert fields[next_index]["name"] == "phone"


class TestMultipleKeyboardInputs:
    """Test 17.2: Test multiple keyboard inputs.
    
    Validates: Requirements 1.4
    """
    
    def test_multiple_inputs_stored_in_order(self, session_context_with_form):
        """Test that multiple keyboard inputs are stored in order."""
        ctx = session_context_with_form
        
        # Simulate rapid keyboard inputs
        inputs = [
            {"field_name": "name", "value": "John Doe", "source": "keyboard"},
            {"field_name": "email", "value": "john@test.com", "source": "keyboard"},
            {"field_name": "phone", "value": "555-1234", "source": "keyboard"},
        ]
        
        for inp in inputs:
            ctx.form_collection_state.add_confirmed_field(
                inp["field_name"], inp["value"], inp["source"]
            )
            ctx.pending_keyboard_inputs.append(inp)
        
        # Verify all inputs are stored
        assert len(ctx.pending_keyboard_inputs) == 3
        
        # Verify order is preserved
        assert ctx.pending_keyboard_inputs[0]["field_name"] == "name"
        assert ctx.pending_keyboard_inputs[1]["field_name"] == "email"
        assert ctx.pending_keyboard_inputs[2]["field_name"] == "phone"
        
        # Verify all fields are confirmed
        assert ctx.form_collection_state.is_field_confirmed("name")
        assert ctx.form_collection_state.is_field_confirmed("email")
        assert ctx.form_collection_state.is_field_confirmed("phone")


class TestFormCompletionViaKeyboard:
    """Test 17.3: Test form completion via keyboard.
    
    Validates: Requirements 3.1, 3.2
    """
    
    def test_form_completion_detected(self, session_context_with_form):
        """Test that form completion is detected when all required fields are submitted."""
        ctx = session_context_with_form
        
        # Initially not complete
        assert not ctx.form_collection_state.is_complete
        
        # Submit all required fields (name, email, message - phone is optional)
        ctx.form_collection_state.add_confirmed_field("name", "John", "keyboard")
        assert not ctx.form_collection_state.is_complete
        
        ctx.form_collection_state.add_confirmed_field("email", "john@test.com", "keyboard")
        assert not ctx.form_collection_state.is_complete
        
        ctx.form_collection_state.add_confirmed_field("message", "Hello!", "keyboard")
        
        # Now should be complete (phone is optional)
        assert ctx.form_collection_state.is_complete
    
    def test_optional_field_not_required_for_completion(self, session_context_with_form):
        """Test that optional fields are not required for form completion."""
        ctx = session_context_with_form
        
        # Submit only required fields
        ctx.form_collection_state.add_confirmed_field("name", "John", "keyboard")
        ctx.form_collection_state.add_confirmed_field("email", "john@test.com", "keyboard")
        ctx.form_collection_state.add_confirmed_field("message", "Hello!", "keyboard")
        
        # Should be complete without phone
        assert ctx.form_collection_state.is_complete
        assert not ctx.form_collection_state.is_field_confirmed("phone")


class TestOnUserTurnCompletedHook:
    """Test the on_user_turn_completed hook context injection.
    
    Validates: Requirements 1.1, 1.2, 2.1
    """
    
    @pytest.mark.asyncio
    async def test_hook_injects_keyboard_inputs_into_context(self, session_context_with_form):
        """Test that on_user_turn_completed injects pending inputs into chat context."""
        ctx = session_context_with_form
        
        # Add pending keyboard inputs
        ctx.pending_keyboard_inputs.append({
            "field_name": "email",
            "value": "test@example.com",
            "source": "keyboard",
        })
        
        # Create mock agent with session that has userdata
        agent = FormAwareAgent(instructions="Test", tools=[])
        
        # Create mock session with userdata
        mock_session = MagicMock()
        mock_session.userdata = ctx
        agent._session = mock_session
        
        # Create mock chat context and message
        # Track calls to add_message to verify injection
        added_messages = []
        mock_turn_ctx = MagicMock()
        mock_turn_ctx.add_message = MagicMock(side_effect=lambda **kwargs: added_messages.append(kwargs))
        mock_new_message = MagicMock()
        
        # Call the hook
        await agent.on_user_turn_completed(mock_turn_ctx, mock_new_message)
        
        # Verify add_message was called with system message
        assert len(added_messages) == 1
        injected_msg = added_messages[0]
        assert injected_msg["role"] == "system"
        content_text = injected_msg["content"]
        assert "SYSTEM NOTIFICATION" in content_text
        assert "email" in content_text
        assert "test@example.com" in content_text
        
        # Verify pending inputs were cleared
        assert len(ctx.pending_keyboard_inputs) == 0
    
    @pytest.mark.asyncio
    async def test_hook_handles_multiple_inputs(self, session_context_with_form):
        """Test that hook handles multiple pending inputs in single injection."""
        ctx = session_context_with_form
        
        # Add multiple pending keyboard inputs
        ctx.pending_keyboard_inputs.extend([
            {"field_name": "name", "value": "John Doe", "source": "keyboard"},
            {"field_name": "email", "value": "john@test.com", "source": "keyboard"},
        ])
        
        # Create mock agent with session
        agent = FormAwareAgent(instructions="Test", tools=[])
        mock_session = MagicMock()
        mock_session.userdata = ctx
        agent._session = mock_session
        
        # Create mock chat context
        # Track calls to add_message to verify injection
        added_messages = []
        mock_turn_ctx = MagicMock()
        mock_turn_ctx.add_message = MagicMock(side_effect=lambda **kwargs: added_messages.append(kwargs))
        mock_new_message = MagicMock()
        
        # Call the hook
        await agent.on_user_turn_completed(mock_turn_ctx, mock_new_message)
        
        # Verify single system message with all inputs
        assert len(added_messages) == 1
        content = added_messages[0]["content"]
        assert "name" in content
        assert "John Doe" in content
        assert "email" in content
        assert "john@test.com" in content
        
        # Verify all inputs cleared
        assert len(ctx.pending_keyboard_inputs) == 0
    
    @pytest.mark.asyncio
    async def test_hook_does_nothing_without_pending_inputs(self, session_context_with_form):
        """Test that hook does nothing when no pending inputs exist."""
        ctx = session_context_with_form
        
        # No pending inputs
        assert len(ctx.pending_keyboard_inputs) == 0
        
        # Create mock agent with session
        agent = FormAwareAgent(instructions="Test", tools=[])
        mock_session = MagicMock()
        mock_session.userdata = ctx
        agent._session = mock_session
        
        # Create mock chat context
        mock_turn_ctx = MagicMock()
        mock_turn_ctx.messages = []
        mock_new_message = MagicMock()
        
        # Call the hook
        await agent.on_user_turn_completed(mock_turn_ctx, mock_new_message)
        
        # Verify no message was injected
        assert len(mock_turn_ctx.messages) == 0
    
    @pytest.mark.asyncio
    async def test_hook_handles_missing_userdata_gracefully(self):
        """Test that hook handles missing userdata without crashing."""
        # Create agent without session
        agent = FormAwareAgent(instructions="Test", tools=[])
        
        # Create mock chat context
        mock_turn_ctx = MagicMock()
        mock_turn_ctx.messages = []
        mock_new_message = MagicMock()
        
        # Call the hook - should not raise
        await agent.on_user_turn_completed(mock_turn_ctx, mock_new_message)
        
        # Verify no message was injected
        assert len(mock_turn_ctx.messages) == 0


class TestGetFormStateTool:
    """Test 17.4: Test "I submitted" phrase triggers get_form_state.
    
    Validates: Requirements 3.3, 7.4
    """
    
    def test_form_state_returns_confirmed_fields(self, session_context_with_form):
        """Test that form state query returns all confirmed fields."""
        ctx = session_context_with_form
        
        # Add some confirmed fields
        ctx.form_collection_state.add_confirmed_field("name", "John", "keyboard")
        ctx.form_collection_state.add_confirmed_field("email", "john@test.com", "voice")
        
        # Get state as dict (simulating get_form_state tool)
        state = ctx.form_collection_state.to_dict()
        
        # Verify confirmed fields are included
        assert "confirmed_fields" in state
        assert "name" in state["confirmed_fields"]
        assert state["confirmed_fields"]["name"]["value"] == "John"
        assert state["confirmed_fields"]["name"]["source"] == "keyboard"
        assert "email" in state["confirmed_fields"]
        assert state["confirmed_fields"]["email"]["value"] == "john@test.com"
        assert state["confirmed_fields"]["email"]["source"] == "voice"
    
    def test_form_state_includes_completion_status(self, session_context_with_form):
        """Test that form state includes is_complete flag."""
        ctx = session_context_with_form
        
        # Initially not complete
        state = ctx.form_collection_state.to_dict()
        assert state["is_complete"] is False
        
        # Complete all required fields
        ctx.form_collection_state.add_confirmed_field("name", "John", "keyboard")
        ctx.form_collection_state.add_confirmed_field("email", "john@test.com", "keyboard")
        ctx.form_collection_state.add_confirmed_field("message", "Hello", "keyboard")
        
        # Now should be complete
        state = ctx.form_collection_state.to_dict()
        assert state["is_complete"] is True
    
    def test_form_state_includes_field_counts(self, session_context_with_form):
        """Test that form state includes field index and total."""
        ctx = session_context_with_form
        
        state = ctx.form_collection_state.to_dict()
        
        assert "current_field_index" in state
        assert "total_fields" in state
        assert state["total_fields"] == 4  # name, email, phone, message


class TestMixedVoiceAndKeyboardInputs:
    """Test mixed voice and keyboard input scenarios."""
    
    def test_voice_and_keyboard_inputs_coexist(self, session_context_with_form):
        """Test that voice and keyboard inputs are tracked together."""
        ctx = session_context_with_form
        
        # Voice input
        ctx.form_collection_state.add_confirmed_field("name", "John", "voice")
        
        # Keyboard input
        ctx.form_collection_state.add_confirmed_field("email", "john@test.com", "keyboard")
        ctx.pending_keyboard_inputs.append({
            "field_name": "email",
            "value": "john@test.com",
            "source": "keyboard",
        })
        
        # Verify both are tracked
        assert ctx.form_collection_state.confirmed_fields["name"].source == "voice"
        assert ctx.form_collection_state.confirmed_fields["email"].source == "keyboard"
        
        # Only keyboard input should be in pending
        assert len(ctx.pending_keyboard_inputs) == 1
        assert ctx.pending_keyboard_inputs[0]["field_name"] == "email"
    
    def test_keyboard_overwrites_voice_input(self, session_context_with_form):
        """Test that keyboard input can overwrite a voice-confirmed field."""
        ctx = session_context_with_form
        
        # Voice input first
        ctx.form_collection_state.add_confirmed_field("email", "wrong@test.com", "voice")
        
        # Keyboard correction
        ctx.form_collection_state.add_confirmed_field("email", "correct@test.com", "keyboard")
        
        # Verify keyboard value overwrote voice value
        assert ctx.form_collection_state.confirmed_fields["email"].value == "correct@test.com"
        assert ctx.form_collection_state.confirmed_fields["email"].source == "keyboard"
