"""Tests for entrypoint function."""

import json
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.entrypoint import _extract_project_id, entrypoint

# Set required environment variables for tests
os.environ.setdefault("LIVEKIT_API_KEY", "test-api-key")
os.environ.setdefault("LIVEKIT_API_SECRET", "test-api-secret")
os.environ.setdefault("LIVEKIT_URL", "wss://test.livekit.cloud")


class TestExtractProjectId:
    """Tests for project_id extraction from room metadata."""

    @pytest.mark.asyncio
    async def test_extract_valid_project_id(self):
        """Test extracting a valid project_id from room metadata."""
        # Arrange
        ctx = MagicMock()
        ctx.room.name = "test-room"
        ctx.room.metadata = json.dumps({"project_id": "550e8400-e29b-41d4-a716-446655440000"})

        # Act
        project_id = await _extract_project_id(ctx)

        # Assert
        assert project_id == "550e8400-e29b-41d4-a716-446655440000"

    @pytest.mark.asyncio
    async def test_extract_project_id_dict_metadata(self):
        """Test extracting project_id when metadata is already a dict."""
        # Arrange
        ctx = MagicMock()
        ctx.room.name = "test-room"
        ctx.room.metadata = {"project_id": "550e8400-e29b-41d4-a716-446655440000"}

        # Act
        project_id = await _extract_project_id(ctx)

        # Assert
        assert project_id == "550e8400-e29b-41d4-a716-446655440000"

    @pytest.mark.asyncio
    async def test_extract_project_id_no_metadata(self):
        """Test handling when room has no metadata."""
        # Arrange
        ctx = MagicMock()
        ctx.room.name = "test-room"
        ctx.room.metadata = None

        # Act
        project_id = await _extract_project_id(ctx)

        # Assert
        assert project_id is None

    @pytest.mark.asyncio
    async def test_extract_project_id_empty_metadata(self):
        """Test handling when metadata is empty string."""
        # Arrange
        ctx = MagicMock()
        ctx.room.name = "test-room"
        ctx.room.metadata = ""

        # Act
        project_id = await _extract_project_id(ctx)

        # Assert
        assert project_id is None

    @pytest.mark.asyncio
    async def test_extract_project_id_invalid_uuid(self):
        """Test handling when project_id is not a valid UUID."""
        # Arrange
        ctx = MagicMock()
        ctx.room.name = "test-room"
        ctx.room.metadata = json.dumps({"project_id": "not-a-uuid"})

        # Act
        project_id = await _extract_project_id(ctx)

        # Assert
        assert project_id is None

    @pytest.mark.asyncio
    async def test_extract_project_id_missing_field(self):
        """Test handling when project_id field is missing."""
        # Arrange
        ctx = MagicMock()
        ctx.room.name = "test-room"
        ctx.room.metadata = json.dumps({"other_field": "value"})

        # Act
        project_id = await _extract_project_id(ctx)

        # Assert
        assert project_id is None

    @pytest.mark.asyncio
    async def test_extract_project_id_malformed_json(self):
        """Test handling when metadata is malformed JSON."""
        # Arrange
        ctx = MagicMock()
        ctx.room.name = "test-room"
        ctx.room.metadata = "{invalid json"

        # Act
        project_id = await _extract_project_id(ctx)

        # Assert
        assert project_id is None


class TestEntrypoint:
    """Tests for main entrypoint function."""

    @pytest.mark.asyncio
    @patch("src.entrypoint.AgentSession")
    @patch("src.entrypoint.Agent")
    async def test_entrypoint_successful_flow(self, mock_agent_class, mock_session_class):
        """Test successful entrypoint execution flow."""
        # Arrange
        ctx = MagicMock()
        ctx.room.name = "test-room"
        ctx.room.metadata = json.dumps({"project_id": "550e8400-e29b-41d4-a716-446655440000"})
        ctx.connect = AsyncMock()
        ctx.wait_for_participant = AsyncMock()
        
        mock_participant = MagicMock()
        mock_participant.identity = "user-123"
        ctx.wait_for_participant.return_value = mock_participant

        mock_agent = MagicMock()
        mock_agent_class.return_value = mock_agent

        mock_session = MagicMock()
        mock_session.start = AsyncMock()
        mock_session_class.return_value = mock_session

        # Act
        await entrypoint(ctx)

        # Assert
        ctx.connect.assert_called_once()
        ctx.wait_for_participant.assert_called_once()
        mock_agent_class.assert_called_once()
        mock_session_class.assert_called_once()
        mock_session.start.assert_called_once_with(
            room=ctx.room, agent=mock_agent, participant=mock_participant
        )

    @pytest.mark.asyncio
    @patch("src.entrypoint.AgentSession")
    @patch("src.entrypoint.Agent")
    async def test_entrypoint_no_project_id(self, mock_agent_class, mock_session_class):
        """Test entrypoint returns early when no project_id in metadata."""
        # Arrange
        ctx = MagicMock()
        ctx.room.name = "test-room"
        ctx.room.metadata = None
        ctx.connect = AsyncMock()
        ctx.wait_for_participant = AsyncMock()
        
        mock_participant = MagicMock()
        ctx.wait_for_participant.return_value = mock_participant

        # Act
        await entrypoint(ctx)

        # Assert
        ctx.connect.assert_called_once()
        ctx.wait_for_participant.assert_called_once()
        # Should not create agent or session
        mock_agent_class.assert_not_called()
        mock_session_class.assert_not_called()

    @pytest.mark.asyncio
    @patch("src.entrypoint.AgentSession")
    @patch("src.entrypoint.Agent")
    async def test_entrypoint_creates_agent_with_instructions(
        self, mock_agent_class, mock_session_class
    ):
        """Test that agent is created with proper instructions."""
        # Arrange
        ctx = MagicMock()
        ctx.room.name = "test-room"
        ctx.room.metadata = json.dumps({"project_id": "550e8400-e29b-41d4-a716-446655440000"})
        ctx.connect = AsyncMock()
        ctx.wait_for_participant = AsyncMock()
        
        mock_participant = MagicMock()
        ctx.wait_for_participant.return_value = mock_participant

        mock_agent = MagicMock()
        mock_agent_class.return_value = mock_agent

        mock_session = MagicMock()
        mock_session.start = AsyncMock()
        mock_session_class.return_value = mock_session

        # Act
        await entrypoint(ctx)

        # Assert
        # Verify Agent was called with instructions keyword argument
        call_kwargs = mock_agent_class.call_args.kwargs
        assert "instructions" in call_kwargs
        assert "helpful voice assistant" in call_kwargs["instructions"]
        assert "conversational" in call_kwargs["instructions"]

    @pytest.mark.asyncio
    @patch("src.entrypoint.AgentSession")
    @patch("src.entrypoint.Agent")
    async def test_entrypoint_initializes_session_with_models(
        self, mock_agent_class, mock_session_class
    ):
        """Test that AgentSession is initialized with correct models."""
        # Arrange
        ctx = MagicMock()
        ctx.room.name = "test-room"
        ctx.room.metadata = json.dumps({"project_id": "550e8400-e29b-41d4-a716-446655440000"})
        ctx.connect = AsyncMock()
        ctx.wait_for_participant = AsyncMock()
        
        mock_participant = MagicMock()
        ctx.wait_for_participant.return_value = mock_participant

        mock_agent = MagicMock()
        mock_agent_class.return_value = mock_agent

        mock_session = MagicMock()
        mock_session.start = AsyncMock()
        mock_session_class.return_value = mock_session

        # Act
        await entrypoint(ctx)

        # Assert
        # Verify AgentSession was called with model configuration
        call_kwargs = mock_session_class.call_args.kwargs
        assert "stt" in call_kwargs
        assert "llm" in call_kwargs
        assert "tts" in call_kwargs
        assert "vad" in call_kwargs
