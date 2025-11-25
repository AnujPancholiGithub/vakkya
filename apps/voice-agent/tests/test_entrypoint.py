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

# Constants
TEST_PROJECT_ID = "550e8400-e29b-41d4-a716-446655440000"
TEST_ROOM_NAME = "test-room"


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def mock_ctx() -> MagicMock:
    """Create a standard mock JobContext with valid project metadata."""
    ctx = MagicMock()
    ctx.room.name = TEST_ROOM_NAME
    ctx.room.metadata = json.dumps({"project_id": TEST_PROJECT_ID})
    ctx.connect = AsyncMock()
    ctx.wait_for_participant = AsyncMock()
    
    mock_participant = MagicMock()
    mock_participant.identity = "user-123"
    ctx.wait_for_participant.return_value = mock_participant
    
    return ctx


@pytest.fixture
def mock_ctx_no_metadata() -> MagicMock:
    """Create a mock JobContext without metadata."""
    ctx = MagicMock()
    ctx.room.name = TEST_ROOM_NAME
    ctx.room.metadata = None
    ctx.connect = AsyncMock()
    ctx.wait_for_participant = AsyncMock()
    
    mock_participant = MagicMock()
    ctx.wait_for_participant.return_value = mock_participant
    
    return ctx


@pytest.fixture
def mock_session_components():
    """Create mocked Agent, AgentSession, and MultilingualModel."""
    with patch("src.entrypoint.MultilingualModel") as mock_multilingual, \
         patch("src.entrypoint.AgentSession") as mock_session_class, \
         patch("src.entrypoint.Agent") as mock_agent_class:
        
        mock_agent = MagicMock()
        mock_agent_class.return_value = mock_agent
        
        mock_session = MagicMock()
        mock_session.start = AsyncMock()
        mock_session_class.__getitem__.return_value = mock_session_class
        mock_session_class.return_value = mock_session
        
        mock_turn_detector = MagicMock()
        mock_multilingual.return_value = mock_turn_detector
        
        yield {
            "agent_class": mock_agent_class,
            "agent": mock_agent,
            "session_class": mock_session_class,
            "session": mock_session,
            "multilingual": mock_multilingual,
        }


@pytest.fixture
def reset_rag_service():
    """Reset global RAG service before and after test."""
    import src.entrypoint
    src.entrypoint._rag_service = None
    yield
    src.entrypoint._rag_service = None


def setup_data_handler_capture(ctx: MagicMock) -> dict:
    """
    Set up data channel handler capture on a mock context.
    
    Returns a dict with 'handler' key that will be populated after entrypoint runs.
    """
    captured = {"handler": None}
    
    def capture_handler(event_name):
        def decorator(func):
            if event_name == "data_received":
                captured["handler"] = func
            return func
        return decorator
    
    ctx.room.on = capture_handler
    return captured


# ============================================================================
# TestExtractProjectId
# ============================================================================


class TestExtractProjectId:
    """Tests for project_id extraction from room metadata."""

    @pytest.mark.asyncio
    async def test_extract_valid_project_id(self) -> None:
        """Test extracting a valid project_id from room metadata."""
        ctx = MagicMock()
        ctx.room.name = TEST_ROOM_NAME
        ctx.room.metadata = json.dumps({"project_id": TEST_PROJECT_ID})

        project_id = await _extract_project_id(ctx)

        assert project_id == TEST_PROJECT_ID

    @pytest.mark.asyncio
    async def test_extract_project_id_dict_metadata(self) -> None:
        """Test extracting project_id when metadata is already a dict."""
        ctx = MagicMock()
        ctx.room.name = TEST_ROOM_NAME
        ctx.room.metadata = {"project_id": TEST_PROJECT_ID}

        project_id = await _extract_project_id(ctx)

        assert project_id == TEST_PROJECT_ID

    @pytest.mark.asyncio
    async def test_extract_project_id_no_metadata(self) -> None:
        """Test handling when room has no metadata."""
        ctx = MagicMock()
        ctx.room.name = TEST_ROOM_NAME
        ctx.room.metadata = None

        project_id = await _extract_project_id(ctx)

        assert project_id is None

    @pytest.mark.asyncio
    async def test_extract_project_id_empty_metadata(self) -> None:
        """Test handling when metadata is empty string."""
        ctx = MagicMock()
        ctx.room.name = TEST_ROOM_NAME
        ctx.room.metadata = ""

        project_id = await _extract_project_id(ctx)

        assert project_id is None

    @pytest.mark.asyncio
    async def test_extract_project_id_invalid_uuid(self) -> None:
        """Test handling when project_id is not a valid UUID."""
        ctx = MagicMock()
        ctx.room.name = TEST_ROOM_NAME
        ctx.room.metadata = json.dumps({"project_id": "not-a-uuid"})

        project_id = await _extract_project_id(ctx)

        assert project_id is None

    @pytest.mark.asyncio
    async def test_extract_project_id_missing_field(self) -> None:
        """Test handling when project_id field is missing."""
        ctx = MagicMock()
        ctx.room.name = TEST_ROOM_NAME
        ctx.room.metadata = json.dumps({"other_field": "value"})

        project_id = await _extract_project_id(ctx)

        assert project_id is None

    @pytest.mark.asyncio
    async def test_extract_project_id_malformed_json(self) -> None:
        """Test handling when metadata is malformed JSON."""
        ctx = MagicMock()
        ctx.room.name = TEST_ROOM_NAME
        ctx.room.metadata = "{invalid json"

        project_id = await _extract_project_id(ctx)

        assert project_id is None


# ============================================================================
# TestEntrypoint
# ============================================================================


class TestEntrypoint:
    """Tests for main entrypoint function."""

    @pytest.mark.asyncio
    async def test_entrypoint_successful_flow(
        self, mock_ctx: MagicMock, mock_session_components: dict
    ) -> None:
        """Test successful entrypoint execution flow."""
        await entrypoint(mock_ctx)

        mock_ctx.connect.assert_called_once()
        mock_ctx.wait_for_participant.assert_called_once()
        mock_session_components["agent_class"].assert_called_once()
        mock_session_components["session_class"].assert_called_once()
        mock_session_components["session"].start.assert_called_once_with(
            room=mock_ctx.room, agent=mock_session_components["agent"]
        )

    @pytest.mark.asyncio
    async def test_entrypoint_no_project_id(
        self, mock_ctx_no_metadata: MagicMock, mock_session_components: dict
    ) -> None:
        """Test entrypoint returns early when no project_id in metadata."""
        await entrypoint(mock_ctx_no_metadata)

        mock_ctx_no_metadata.connect.assert_called_once()
        mock_ctx_no_metadata.wait_for_participant.assert_called_once()
        # Should not create agent or session
        mock_session_components["agent_class"].assert_not_called()
        mock_session_components["session_class"].assert_not_called()
        mock_session_components["multilingual"].assert_not_called()

    @pytest.mark.asyncio
    async def test_entrypoint_creates_agent_with_instructions(
        self, mock_ctx: MagicMock, mock_session_components: dict
    ) -> None:
        """Test that agent is created with proper instructions."""
        await entrypoint(mock_ctx)

        call_kwargs = mock_session_components["agent_class"].call_args.kwargs
        assert "instructions" in call_kwargs
        assert "helpful voice assistant" in call_kwargs["instructions"]
        assert "conversational" in call_kwargs["instructions"]

    @pytest.mark.asyncio
    async def test_entrypoint_initializes_session_with_models(
        self, mock_ctx: MagicMock, mock_session_components: dict
    ) -> None:
        """Test that AgentSession is initialized with correct models."""
        await entrypoint(mock_ctx)

        call_kwargs = mock_session_components["session_class"].call_args.kwargs
        assert "stt" in call_kwargs
        assert "llm" in call_kwargs
        assert "tts" in call_kwargs
        assert "vad" in call_kwargs
        assert "turn_detection" in call_kwargs


# ============================================================================
# TestDataChannelHandling
# ============================================================================


class TestDataChannelHandling:
    """Tests for data channel message handling."""

    @pytest.mark.asyncio
    async def test_data_channel_handler_registered(
        self, mock_ctx: MagicMock, mock_session_components: dict
    ) -> None:
        """Test that data channel handler is registered on room."""
        await entrypoint(mock_ctx)

        mock_ctx.room.on.assert_called_with("data_received")

    @pytest.mark.asyncio
    async def test_data_channel_receives_valid_page_context(
        self, mock_ctx: MagicMock, mock_session_components: dict
    ) -> None:
        """Test handling valid page context from data channel."""
        captured = setup_data_handler_capture(mock_ctx)

        await entrypoint(mock_ctx)

        # Simulate data channel message
        mock_data_packet = MagicMock()
        mock_data_packet.data = json.dumps({"url": "https://example.com/page"}).encode("utf-8")
        
        # Should not raise exception
        captured["handler"](mock_data_packet)

    @pytest.mark.asyncio
    async def test_data_channel_handles_invalid_json(
        self, mock_ctx: MagicMock, mock_session_components: dict
    ) -> None:
        """Test handling invalid JSON in data channel message."""
        captured = setup_data_handler_capture(mock_ctx)

        await entrypoint(mock_ctx)

        mock_data_packet = MagicMock()
        mock_data_packet.data = b"{invalid json"
        
        # Should not raise exception - should log warning instead
        captured["handler"](mock_data_packet)

    @pytest.mark.asyncio
    async def test_data_channel_handles_invalid_url(
        self, mock_ctx: MagicMock, mock_session_components: dict
    ) -> None:
        """Test handling invalid URL in page context."""
        captured = setup_data_handler_capture(mock_ctx)

        await entrypoint(mock_ctx)

        # Simulate invalid URL (localhost should be blocked)
        mock_data_packet = MagicMock()
        mock_data_packet.data = json.dumps({"url": "http://localhost/admin"}).encode("utf-8")
        
        # Should not raise exception - should log warning instead
        captured["handler"](mock_data_packet)

    @pytest.mark.asyncio
    async def test_data_channel_handles_missing_url_field(
        self, mock_ctx: MagicMock, mock_session_components: dict
    ) -> None:
        """Test handling missing url field in page context."""
        captured = setup_data_handler_capture(mock_ctx)

        await entrypoint(mock_ctx)

        mock_data_packet = MagicMock()
        mock_data_packet.data = json.dumps({"other_field": "value"}).encode("utf-8")
        
        # Should not raise exception - should log warning instead
        captured["handler"](mock_data_packet)


# ============================================================================
# TestSearchKnowledgeTool
# ============================================================================


class TestSearchKnowledgeTool:
    """Tests for the search_knowledge RAG tool."""

    @pytest.mark.asyncio
    async def test_search_knowledge_returns_results(self, reset_rag_service) -> None:
        """Test search_knowledge returns formatted results from RAG service."""
        from src.entrypoint import search_knowledge
        from src.models import SessionContext
        
        mock_context = MagicMock()
        mock_context.userdata = SessionContext(
            project_id=TEST_PROJECT_ID,
            page_context=None,
        )
        
        mock_rag = AsyncMock()
        mock_rag.search_formatted = AsyncMock(
            return_value="[Document 1] (relevance: 0.95)\nRelevant content here"
        )
        
        with patch("src.entrypoint.get_rag_service", return_value=mock_rag):
            result = await search_knowledge(mock_context, "How do I reset my password?")
        
        assert "Relevant content" in result
        mock_rag.search_formatted.assert_called_once_with(
            query="How do I reset my password?",
            project_id=TEST_PROJECT_ID,
            top_k=3,
        )

    @pytest.mark.asyncio
    async def test_search_knowledge_no_session_context(self) -> None:
        """Test search_knowledge handles missing session context gracefully."""
        from src.entrypoint import search_knowledge
        
        mock_context = MagicMock()
        mock_context.userdata = None
        
        result = await search_knowledge(mock_context, "test query")
        
        assert result == "No relevant documents found."

    @pytest.mark.asyncio
    async def test_search_knowledge_handles_rag_error(self, reset_rag_service) -> None:
        """Test search_knowledge returns fallback message on RAG error."""
        from src.entrypoint import search_knowledge
        from src.models import SessionContext
        
        mock_context = MagicMock()
        mock_context.userdata = SessionContext(
            project_id=TEST_PROJECT_ID,
            page_context=None,
        )
        
        mock_rag = AsyncMock()
        mock_rag.search_formatted = AsyncMock(side_effect=Exception("Database error"))
        
        with patch("src.entrypoint.get_rag_service", return_value=mock_rag):
            result = await search_knowledge(mock_context, "test query")
        
        assert "couldn't search" in result.lower()


# ============================================================================
# TestBuildAgentInstructions
# ============================================================================


class TestBuildAgentInstructions:
    """Tests for agent instruction building."""

    def test_build_instructions_without_page_url(self) -> None:
        """Test building instructions without page context."""
        from src.entrypoint import _build_agent_instructions
        
        instructions = _build_agent_instructions(None)
        
        assert "helpful voice assistant" in instructions
        assert "search_knowledge" in instructions
        assert "conversational" in instructions
        assert "viewing:" not in instructions

    def test_build_instructions_with_page_url(self) -> None:
        """Test building instructions with page context."""
        from src.entrypoint import _build_agent_instructions
        
        instructions = _build_agent_instructions("https://example.com/docs/getting-started")
        
        assert "helpful voice assistant" in instructions
        assert "https://example.com/docs/getting-started" in instructions
        assert "viewing:" in instructions


# ============================================================================
# TestGetRagService
# ============================================================================


class TestGetRagService:
    """Tests for RAG service initialization."""

    @pytest.mark.asyncio
    async def test_get_rag_service_initializes_once(self, reset_rag_service) -> None:
        """Test RAG service is initialized only once (singleton)."""
        mock_rag = MagicMock()
        mock_rag.initialize = AsyncMock()
        
        with patch("src.entrypoint.create_rag_service", return_value=mock_rag) as mock_create:
            with patch("src.entrypoint.get_config") as mock_config:
                mock_config.return_value.database_url = "postgresql://test"
                mock_config.return_value.openai_api_key = "test-key"
                
                from src.entrypoint import get_rag_service
                
                # First call should initialize
                service1 = await get_rag_service()
                # Second call should return cached instance
                service2 = await get_rag_service()
                
                assert service1 is service2
                mock_create.assert_called_once()
                mock_rag.initialize.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_rag_service_requires_openai_key(self, reset_rag_service) -> None:
        """Test RAG service raises error without OpenAI key."""
        with patch("src.entrypoint.get_config") as mock_config:
            mock_config.return_value.database_url = "postgresql://test"
            mock_config.return_value.openai_api_key = None
            
            from src.entrypoint import get_rag_service
            
            with pytest.raises(RuntimeError, match="OPENAI_API_KEY"):
                await get_rag_service()


# ============================================================================
# TestAgentWithRagTool
# ============================================================================


class TestAgentWithRagTool:
    """Tests for Agent creation with RAG tool."""

    @pytest.mark.asyncio
    async def test_agent_created_with_tools(
        self, mock_ctx: MagicMock, mock_session_components: dict
    ) -> None:
        """Test that Agent is created with search_knowledge tool."""
        from src.entrypoint import search_knowledge
        
        await entrypoint(mock_ctx)

        call_kwargs = mock_session_components["agent_class"].call_args.kwargs
        assert "tools" in call_kwargs
        assert search_knowledge in call_kwargs["tools"]


# ============================================================================
# TestErrorHandling
# ============================================================================


class TestErrorHandling:
    """Tests for error handling in entrypoint function."""

    @pytest.mark.asyncio
    async def test_entrypoint_handles_connection_error(
        self, mock_ctx: MagicMock, mock_session_components: dict
    ) -> None:
        """Test that connection errors are logged and raised."""
        mock_ctx.connect = AsyncMock(side_effect=Exception("Connection failed"))

        with pytest.raises(Exception, match="Connection failed"):
            await entrypoint(mock_ctx)

    @pytest.mark.asyncio
    async def test_entrypoint_handles_participant_wait_error(
        self, mock_ctx: MagicMock, mock_session_components: dict
    ) -> None:
        """Test that participant wait errors are logged and raised."""
        mock_ctx.wait_for_participant = AsyncMock(
            side_effect=Exception("Participant wait failed")
        )

        with pytest.raises(Exception, match="Participant wait failed"):
            await entrypoint(mock_ctx)

    @pytest.mark.asyncio
    async def test_entrypoint_handles_session_initialization_error(
        self, mock_ctx: MagicMock, mock_session_components: dict
    ) -> None:
        """Test that session initialization errors are logged and raised."""
        mock_session_components["session_class"].side_effect = Exception("Session init failed")

        with pytest.raises(Exception, match="Session init failed"):
            await entrypoint(mock_ctx)

    @pytest.mark.asyncio
    async def test_entrypoint_handles_session_start_error(
        self, mock_ctx: MagicMock, mock_session_components: dict
    ) -> None:
        """Test that session start errors are logged and raised."""
        mock_session_components["session"].start = AsyncMock(
            side_effect=Exception("Session start failed")
        )

        with pytest.raises(Exception, match="Session start failed"):
            await entrypoint(mock_ctx)

    @pytest.mark.asyncio
    async def test_data_channel_error_does_not_interrupt_session(
        self, mock_ctx: MagicMock, mock_session_components: dict
    ) -> None:
        """Test that data channel errors are logged but don't interrupt session."""
        captured = setup_data_handler_capture(mock_ctx)

        await entrypoint(mock_ctx)

        # Simulate data channel error (malformed data)
        mock_data_packet = MagicMock()
        mock_data_packet.data = b"not json at all"
        
        # Should not raise exception - should log warning instead
        captured["handler"](mock_data_packet)
        
        # Assert session was still started
        mock_session_components["session"].start.assert_called_once()
