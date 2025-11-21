"""Tests for session state management."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.models import DocumentChunk, PageContext, Session, Turn
from src.session_manager import SessionManager

# Test constants
TEST_PROJECT_ID = "550e8400-e29b-41d4-a716-446655440000"
TEST_SESSION_ID = "session-123"
TEST_ROOM_NAME = "room-456"
FIXED_TIMESTAMP = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)


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
            project_id=TEST_PROJECT_ID,
            room_name=TEST_ROOM_NAME,
        )

        # Assert
        assert session.project_id == TEST_PROJECT_ID
        assert session.room_name == TEST_ROOM_NAME
        assert session.status == "active"
        assert session.page_context is None
        assert session.conversation_history == []
        assert isinstance(session.created_at, datetime)
        
        # Verify database insert was called
        conn.execute.assert_called_once()
        call_args = conn.execute.call_args[0]
        assert "INSERT INTO conversations" in call_args[0]

    @pytest.mark.asyncio
    async def test_get_session_found(self, mock_db_pool):
        """Test retrieving an existing session."""
        # Arrange
        pool, conn = mock_db_pool
        
        # Mock data with camelCase column names (matches Prisma PostgreSQL schema)
        session_row = {
            "id": TEST_SESSION_ID,
            "projectId": TEST_PROJECT_ID,
            "sessionId": TEST_ROOM_NAME,  # LiveKit room name stored here
            "startedAt": FIXED_TIMESTAMP,
            "turnCount": 1,
        }
        
        turn_rows = [
            {
                "id": "turn-1",
                "conversationId": TEST_SESSION_ID,
                "userQuery": "What is X?",
                "agentResponse": "X is...",
                "timestamp": FIXED_TIMESTAMP,
            }
        ]
        
        conn.fetchrow = AsyncMock(return_value=session_row)
        conn.fetch = AsyncMock(return_value=turn_rows)
        
        manager = SessionManager(db_pool=pool)

        # Act
        session = await manager.get_session(TEST_SESSION_ID)

        # Assert
        assert session is not None
        assert session.session_id == TEST_SESSION_ID
        assert session.project_id == TEST_PROJECT_ID
        assert session.room_name == TEST_ROOM_NAME
        assert session.page_context is None  # No page context in MVP
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
        
        # Mock data with camelCase column names (matches Prisma PostgreSQL schema)
        session_row = {
            "id": TEST_SESSION_ID,
            "projectId": TEST_PROJECT_ID,
            "sessionId": TEST_ROOM_NAME,  # LiveKit room name stored here
            "startedAt": FIXED_TIMESTAMP,
            "turnCount": 0,
        }
        
        conn.fetchrow = AsyncMock(return_value=session_row)
        conn.fetch = AsyncMock(return_value=[])
        
        manager = SessionManager(db_pool=pool)

        # Act
        session = await manager.get_session(TEST_SESSION_ID)

        # Assert
        assert session is not None
        assert session.page_context is None

    @pytest.mark.asyncio
    async def test_get_session_limits_history_to_3_turns(self, mock_db_pool):
        """Test that conversation history is limited to last 3 turns."""
        # Arrange
        pool, conn = mock_db_pool
        
        # Mock data with camelCase column names (matches Prisma PostgreSQL schema)
        session_row = {
            "id": TEST_SESSION_ID,
            "projectId": TEST_PROJECT_ID,
            "sessionId": TEST_ROOM_NAME,  # LiveKit room name stored here
            "startedAt": FIXED_TIMESTAMP,
            "turnCount": 3,
        }
        
        # Create 3 turns (should all be returned)
        turn_rows = [
            {
                "id": f"turn-{i}",
                "conversationId": TEST_SESSION_ID,
                "userQuery": f"Query {i}",
                "agentResponse": f"Response {i}",
                "timestamp": FIXED_TIMESTAMP,
            }
            for i in range(3)
        ]
        
        conn.fetchrow = AsyncMock(return_value=session_row)
        conn.fetch = AsyncMock(return_value=turn_rows)
        
        manager = SessionManager(db_pool=pool)

        # Act
        session = await manager.get_session(TEST_SESSION_ID)

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
        await manager.update_page_context(TEST_SESSION_ID, page_context)

        # Assert
        # In MVP, page context is not persisted to DB (no-op)
        # This will be implemented in task 7
        conn.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_add_turn(self, mock_db_pool):
        """Test adding a conversation turn."""
        # Arrange
        pool, conn = mock_db_pool
        conn.execute = AsyncMock()
        
        manager = SessionManager(db_pool=pool)
        
        turn = Turn.create(
            session_id=TEST_SESSION_ID,
            user_query="What is the weather?",
            agent_response="It's sunny today.",
            rag_documents=[
                DocumentChunk(content="Weather info", metadata={"source": "doc1"})
            ],
        )

        # Act
        await manager.add_turn(TEST_SESSION_ID, turn)

        # Assert - now makes 2 calls: INSERT turn + UPDATE turn_count
        assert conn.execute.call_count == 2
        
        # Check first call (INSERT turn)
        first_call = conn.execute.call_args_list[0][0]
        assert "INSERT INTO conversation_turns" in first_call[0]
        assert first_call[1] == turn.turn_id
        assert first_call[2] == TEST_SESSION_ID
        assert first_call[3] == "What is the weather?"
        assert first_call[4] == "It's sunny today."
        
        # Check second call (UPDATE turnCount)
        second_call = conn.execute.call_args_list[1][0]
        assert "UPDATE conversations" in second_call[0]
        assert "turnCount" in second_call[0]
        assert second_call[1] == TEST_SESSION_ID  # Verify correct session_id

    @pytest.mark.asyncio
    async def test_add_turn_with_empty_rag_documents(self, mock_db_pool):
        """Test adding a turn with no RAG documents."""
        # Arrange
        pool, conn = mock_db_pool
        conn.execute = AsyncMock()
        
        manager = SessionManager(db_pool=pool)
        
        turn = Turn.create(
            session_id=TEST_SESSION_ID,
            user_query="Hello",
            agent_response="Hi there!",
        )

        # Act
        await manager.add_turn(TEST_SESSION_ID, turn)

        # Assert - now makes 2 calls: INSERT turn + UPDATE turn_count
        assert conn.execute.call_count == 2
        
        # Check first call (INSERT turn)
        first_call = conn.execute.call_args_list[0][0]
        assert "INSERT INTO conversation_turns" in first_call[0]

    @pytest.mark.asyncio
    async def test_complete_session(self, mock_db_pool):
        """Test marking a session as completed."""
        # Arrange
        pool, conn = mock_db_pool
        conn.execute = AsyncMock()
        
        manager = SessionManager(db_pool=pool)

        # Act
        await manager.complete_session(TEST_SESSION_ID)

        # Assert
        # In MVP, status is not persisted to DB (no-op)
        conn.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_log_to_api_success(self, mock_db_pool):
        """Test successfully logging a turn to the API."""
        # Arrange
        pool, _ = mock_db_pool
        manager = SessionManager(db_pool=pool)
        
        turn = Turn.create(
            session_id=TEST_SESSION_ID,
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
            await manager.log_to_api(TEST_SESSION_ID, turn, "https://api.example.com")
            
            # Assert
            mock_client.post.assert_called_once()
            call_args = mock_client.post.call_args
            assert call_args[0][0] == "https://api.example.com/api/conversations/log"
            assert call_args[1]["json"]["session_id"] == TEST_SESSION_ID
            assert call_args[1]["json"]["user_query"] == "Test query"

    @pytest.mark.asyncio
    async def test_log_to_api_failure(self, mock_db_pool):
        """Test handling API logging failure gracefully."""
        # Arrange
        pool, _ = mock_db_pool
        manager = SessionManager(db_pool=pool)
        
        turn = Turn.create(
            session_id=TEST_SESSION_ID,
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
            await manager.log_to_api(TEST_SESSION_ID, turn, "https://api.example.com")
            
            # Assert - just verify it was called
            mock_client.post.assert_called_once()

    @pytest.mark.asyncio
    async def test_log_to_api_exception(self, mock_db_pool):
        """Test handling exception during API logging."""
        # Arrange
        pool, _ = mock_db_pool
        manager = SessionManager(db_pool=pool)
        
        turn = Turn.create(
            session_id=TEST_SESSION_ID,
            user_query="Test query",
            agent_response="Test response",
        )
        
        # Mock httpx to raise exception
        with patch("httpx.AsyncClient", side_effect=Exception("Network error")):
            # Act - should not raise exception
            await manager.log_to_api(TEST_SESSION_ID, turn, "https://api.example.com")
            
            # Assert - no exception raised, error logged internally
