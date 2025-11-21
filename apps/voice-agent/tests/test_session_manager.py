"""Tests for session state management."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.models import DocumentChunk, PageContext, Session, Turn
from src.session_manager import SessionManager


@pytest.fixture
def mock_db_pool():
    """Create a mock database connection pool."""
    pool = MagicMock()
    conn = MagicMock()
    
    # Mock the async context manager for acquire()
    pool.acquire.return_value.__aenter__ = AsyncMock(return_value=conn)
    pool.acquire.return_value.__aexit__ = AsyncMock()
    
    return pool, conn


class TestSessionManager:
    """Tests for SessionManager."""

    @pytest.mark.asyncio
    async def test_create_session(self, mock_db_pool):
        """Test creating a new session."""
        # Arrange
        pool, conn = mock_db_pool
        conn.execute = AsyncMock()
        manager = SessionManager(db_pool=pool)

        # Act
        session = await manager.create_session(
            project_id="550e8400-e29b-41d4-a716-446655440000",
            room_name="room-123",
        )

        # Assert
        assert session.project_id == "550e8400-e29b-41d4-a716-446655440000"
        assert session.room_name == "room-123"
        assert session.status == "active"
        assert session.page_context is None
        assert session.conversation_history == []
        assert isinstance(session.created_at, datetime)
        
        # Verify database insert was called
        conn.execute.assert_called_once()
        call_args = conn.execute.call_args[0]
        assert "INSERT INTO voice_sessions" in call_args[0]

    @pytest.mark.asyncio
    async def test_get_session_found(self, mock_db_pool):
        """Test retrieving an existing session."""
        # Arrange
        pool, conn = mock_db_pool
        
        session_row = {
            "session_id": "session-123",
            "project_id": "550e8400-e29b-41d4-a716-446655440000",
            "room_name": "room-456",
            "page_url": "https://example.com/page",
            "created_at": datetime.now(UTC),
            "status": "active",
        }
        
        turn_rows = [
            {
                "turn_id": "turn-1",
                "session_id": "session-123",
                "user_query": "What is X?",
                "agent_response": "X is...",
                "rag_documents": [],
                "timestamp": datetime.now(UTC),
            }
        ]
        
        conn.fetchrow = AsyncMock(return_value=session_row)
        conn.fetch = AsyncMock(return_value=turn_rows)
        
        manager = SessionManager(db_pool=pool)

        # Act
        session = await manager.get_session("session-123")

        # Assert
        assert session is not None
        assert session.session_id == "session-123"
        assert session.project_id == "550e8400-e29b-41d4-a716-446655440000"
        assert session.room_name == "room-456"
        assert session.page_context.url == "https://example.com/page"
        assert len(session.conversation_history) == 1
        assert session.conversation_history[0].user_query == "What is X?"

    @pytest.mark.asyncio
    async def test_get_session_not_found(self, mock_db_pool):
        """Test retrieving a non-existent session."""
        # Arrange
        pool, conn = mock_db_pool
        conn.fetchrow = AsyncMock(return_value=None)
        
        manager = SessionManager(db_pool=pool)

        # Act
        session = await manager.get_session("nonexistent-session")

        # Assert
        assert session is None

    @pytest.mark.asyncio
    async def test_get_session_no_page_context(self, mock_db_pool):
        """Test retrieving a session without page context."""
        # Arrange
        pool, conn = mock_db_pool
        
        session_row = {
            "session_id": "session-123",
            "project_id": "550e8400-e29b-41d4-a716-446655440000",
            "room_name": "room-456",
            "page_url": None,  # No page context
            "created_at": datetime.now(UTC),
            "status": "active",
        }
        
        conn.fetchrow = AsyncMock(return_value=session_row)
        conn.fetch = AsyncMock(return_value=[])
        
        manager = SessionManager(db_pool=pool)

        # Act
        session = await manager.get_session("session-123")

        # Assert
        assert session is not None
        assert session.page_context is None

    @pytest.mark.asyncio
    async def test_get_session_limits_history_to_3_turns(self, mock_db_pool):
        """Test that conversation history is limited to last 3 turns."""
        # Arrange
        pool, conn = mock_db_pool
        
        session_row = {
            "session_id": "session-123",
            "project_id": "550e8400-e29b-41d4-a716-446655440000",
            "room_name": "room-456",
            "page_url": None,
            "created_at": datetime.now(UTC),
            "status": "active",
        }
        
        # Create 3 turns (should all be returned)
        turn_rows = [
            {
                "turn_id": f"turn-{i}",
                "session_id": "session-123",
                "user_query": f"Query {i}",
                "agent_response": f"Response {i}",
                "rag_documents": [],
                "timestamp": datetime.now(UTC),
            }
            for i in range(3)
        ]
        
        conn.fetchrow = AsyncMock(return_value=session_row)
        conn.fetch = AsyncMock(return_value=turn_rows)
        
        manager = SessionManager(db_pool=pool)

        # Act
        session = await manager.get_session("session-123")

        # Assert
        assert len(session.conversation_history) == 3
        
        # Verify SQL query limits to 3
        call_args = conn.fetch.call_args[0]
        assert "LIMIT 3" in call_args[0]

    @pytest.mark.asyncio
    async def test_update_page_context(self, mock_db_pool):
        """Test updating page context for a session."""
        # Arrange
        pool, conn = mock_db_pool
        conn.execute = AsyncMock()
        
        manager = SessionManager(db_pool=pool)
        page_context = PageContext(url="https://example.com/new-page")

        # Act
        await manager.update_page_context("session-123", page_context)

        # Assert
        conn.execute.assert_called_once()
        call_args = conn.execute.call_args[0]
        assert "UPDATE voice_sessions" in call_args[0]
        assert "SET page_url" in call_args[0]
        assert call_args[1] == "https://example.com/new-page"
        assert call_args[2] == "session-123"

    @pytest.mark.asyncio
    async def test_add_turn(self, mock_db_pool):
        """Test adding a conversation turn."""
        # Arrange
        pool, conn = mock_db_pool
        conn.execute = AsyncMock()
        
        manager = SessionManager(db_pool=pool)
        
        turn = Turn.create(
            session_id="session-123",
            user_query="What is the weather?",
            agent_response="It's sunny today.",
            rag_documents=[
                DocumentChunk(content="Weather info", metadata={"source": "doc1"})
            ],
        )

        # Act
        await manager.add_turn("session-123", turn)

        # Assert
        conn.execute.assert_called_once()
        call_args = conn.execute.call_args[0]
        assert "INSERT INTO conversation_turns" in call_args[0]
        assert call_args[1] == turn.turn_id
        assert call_args[2] == "session-123"
        assert call_args[3] == "What is the weather?"
        assert call_args[4] == "It's sunny today."

    @pytest.mark.asyncio
    async def test_add_turn_with_empty_rag_documents(self, mock_db_pool):
        """Test adding a turn with no RAG documents."""
        # Arrange
        pool, conn = mock_db_pool
        conn.execute = AsyncMock()
        
        manager = SessionManager(db_pool=pool)
        
        turn = Turn.create(
            session_id="session-123",
            user_query="Hello",
            agent_response="Hi there!",
        )

        # Act
        await manager.add_turn("session-123", turn)

        # Assert
        conn.execute.assert_called_once()
        call_args = conn.execute.call_args[0]
        # RAG documents should be empty list
        assert call_args[5] == []

    @pytest.mark.asyncio
    async def test_complete_session(self, mock_db_pool):
        """Test marking a session as completed."""
        # Arrange
        pool, conn = mock_db_pool
        conn.execute = AsyncMock()
        
        manager = SessionManager(db_pool=pool)

        # Act
        await manager.complete_session("session-123")

        # Assert
        conn.execute.assert_called_once()
        call_args = conn.execute.call_args[0]
        assert "UPDATE voice_sessions" in call_args[0]
        assert "SET status = 'completed'" in call_args[0]
        assert call_args[1] == "session-123"

    @pytest.mark.asyncio
    async def test_log_to_api_success(self, mock_db_pool):
        """Test successfully logging a turn to the API."""
        # Arrange
        pool, _ = mock_db_pool
        manager = SessionManager(db_pool=pool)
        
        turn = Turn.create(
            session_id="session-123",
            user_query="Test query",
            agent_response="Test response",
        )
        
        # Mock httpx
        mock_response = MagicMock()
        mock_response.status_code = 200
        
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock()
        
        with patch("httpx.AsyncClient", return_value=mock_client):
            # Act
            await manager.log_to_api("session-123", turn, "https://api.example.com")
            
            # Assert
            mock_client.post.assert_called_once()
            call_args = mock_client.post.call_args
            assert call_args[0][0] == "https://api.example.com/api/conversations/log"
            assert call_args[1]["json"]["session_id"] == "session-123"
            assert call_args[1]["json"]["user_query"] == "Test query"

    @pytest.mark.asyncio
    async def test_log_to_api_failure(self, mock_db_pool):
        """Test handling API logging failure gracefully."""
        # Arrange
        pool, _ = mock_db_pool
        manager = SessionManager(db_pool=pool)
        
        turn = Turn.create(
            session_id="session-123",
            user_query="Test query",
            agent_response="Test response",
        )
        
        # Mock httpx to return error status
        mock_response = MagicMock()
        mock_response.status_code = 500
        
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock()
        
        with patch("httpx.AsyncClient", return_value=mock_client):
            # Act - should not raise exception
            await manager.log_to_api("session-123", turn, "https://api.example.com")
            
            # Assert - just verify it was called
            mock_client.post.assert_called_once()

    @pytest.mark.asyncio
    async def test_log_to_api_exception(self, mock_db_pool):
        """Test handling exception during API logging."""
        # Arrange
        pool, _ = mock_db_pool
        manager = SessionManager(db_pool=pool)
        
        turn = Turn.create(
            session_id="session-123",
            user_query="Test query",
            agent_response="Test response",
        )
        
        # Mock httpx to raise exception
        with patch("httpx.AsyncClient", side_effect=Exception("Network error")):
            # Act - should not raise exception
            await manager.log_to_api("session-123", turn, "https://api.example.com")
            
            # Assert - no exception raised, error logged internally
