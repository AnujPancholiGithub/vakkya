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

    def test_init_with_none_pool(self):
        """Test that SessionManager allows None db_pool for API-only usage."""
        manager = SessionManager(db_pool=None)
        assert manager.db_pool is None

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
        
        # Verify database calls: SET statement_timeout + INSERT
        assert conn.execute.call_count == 2
        # First call sets timeout
        first_call = conn.execute.call_args_list[0][0]
        assert "statement_timeout" in first_call[0]
        # Second call is the INSERT
        second_call = conn.execute.call_args_list[1][0]
        assert "INSERT INTO conversations" in second_call[0]

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
        
        conn.execute = AsyncMock()  # For SET statement_timeout
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
        conn.execute = AsyncMock()  # For SET statement_timeout
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
        
        conn.execute = AsyncMock()  # For SET statement_timeout
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
        
        conn.execute = AsyncMock()  # For SET statement_timeout
        conn.fetchrow = AsyncMock(return_value=session_row)
        conn.fetch = AsyncMock(return_value=turn_rows)
        
        manager = SessionManager(db_pool=pool)

        # Act
        session = await manager.get_session(TEST_SESSION_ID)

        # Assert
        assert len(session.conversation_history) == 3
        
        # Verify SQL query uses MAX_CONVERSATION_HISTORY constant
        call_args = conn.fetch.call_args[0]
        assert "LIMIT $2" in call_args[0]
        assert call_args[2] == 3  # MAX_CONVERSATION_HISTORY value

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

        # Assert - now makes 3 calls: SET timeout + INSERT turn + UPDATE turn_count
        assert conn.execute.call_count == 3
        
        # Check first call (SET statement_timeout)
        first_call = conn.execute.call_args_list[0][0]
        assert "statement_timeout" in first_call[0]
        
        # Check second call (INSERT turn)
        second_call = conn.execute.call_args_list[1][0]
        assert "INSERT INTO conversation_turns" in second_call[0]
        assert second_call[1] == turn.turn_id
        assert second_call[2] == TEST_SESSION_ID
        assert second_call[3] == "What is the weather?"
        assert second_call[4] == "It's sunny today."
        
        # Check third call (UPDATE turnCount)
        third_call = conn.execute.call_args_list[2][0]
        assert "UPDATE conversations" in third_call[0]
        assert "turnCount" in third_call[0]
        assert third_call[1] == TEST_SESSION_ID  # Verify correct session_id

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

        # Assert - now makes 3 calls: SET timeout + INSERT turn + UPDATE turn_count
        assert conn.execute.call_count == 3
        
        # Check second call (INSERT turn - after SET timeout)
        second_call = conn.execute.call_args_list[1][0]
        assert "INSERT INTO conversation_turns" in second_call[0]

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
    async def test_log_turn_to_api_success(self, mock_db_pool):
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
        mock_response.status_code = 201
        
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock()
        
        with patch("httpx.AsyncClient", return_value=mock_client):
            # Act
            result = await manager.log_turn_to_api(
                conversation_id="conv-123",
                turn=turn,
                widget_token="a" * 64,
                api_url="https://api.example.com",
            )
            
            # Assert
            assert result is True
            mock_client.post.assert_called_once()
            call_args = mock_client.post.call_args
            assert call_args[0][0] == "https://api.example.com/conversations/conv-123/turns"
            assert call_args[1]["json"]["userQuery"] == "Test query"
            assert call_args[1]["json"]["agentResponse"] == "Test response"
            assert call_args[1]["json"]["widgetToken"] == "a" * 64

    @pytest.mark.asyncio
    async def test_log_turn_to_api_failure(self, mock_db_pool):
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
            result = await manager.log_turn_to_api(
                conversation_id="conv-123",
                turn=turn,
                widget_token="a" * 64,
                api_url="https://api.example.com",
            )
            
            # Assert
            assert result is False
            mock_client.post.assert_called_once()

    @pytest.mark.asyncio
    async def test_log_turn_to_api_exception(self, mock_db_pool):
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
            result = await manager.log_turn_to_api(
                conversation_id="conv-123",
                turn=turn,
                widget_token="a" * 64,
                api_url="https://api.example.com",
            )
            
            # Assert - returns False, no exception raised
            assert result is False

    @pytest.mark.asyncio
    async def test_create_api_conversation_success(self, mock_db_pool):
        """Test successfully creating an API conversation."""
        # Arrange
        pool, _ = mock_db_pool
        manager = SessionManager(db_pool=pool)
        
        # Mock httpx
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"conversation": {"id": "conv-123"}}
        
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock()
        
        with patch("httpx.AsyncClient", return_value=mock_client):
            # Act
            result = await manager.create_api_conversation(
                project_id=TEST_PROJECT_ID,
                session_id="room-123",
                widget_token="a" * 64,
                api_url="https://api.example.com",
            )
            
            # Assert
            assert result == "conv-123"
            mock_client.post.assert_called_once()
            call_args = mock_client.post.call_args
            assert call_args[0][0] == "https://api.example.com/conversations"
            assert call_args[1]["json"]["projectId"] == TEST_PROJECT_ID
            assert call_args[1]["json"]["sessionId"] == "room-123"

    @pytest.mark.asyncio
    async def test_create_api_conversation_failure(self, mock_db_pool):
        """Test handling API conversation creation failure."""
        # Arrange
        pool, _ = mock_db_pool
        manager = SessionManager(db_pool=pool)
        
        # Mock httpx to return error
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"
        
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock()
        
        with patch("httpx.AsyncClient", return_value=mock_client):
            # Act
            result = await manager.create_api_conversation(
                project_id=TEST_PROJECT_ID,
                session_id="room-123",
                widget_token="invalid",
                api_url="https://api.example.com",
            )
            
            # Assert
            assert result is None

    @pytest.mark.asyncio
    async def test_legacy_log_to_api_warns(self, mock_db_pool):
        """Test that legacy log_to_api method logs a warning."""
        # Arrange
        pool, _ = mock_db_pool
        manager = SessionManager(db_pool=pool)
        
        turn = Turn.create(
            session_id=TEST_SESSION_ID,
            user_query="Test query",
            agent_response="Test response",
        )
        
        # Act - should not raise exception, just log warning
        await manager.log_to_api(TEST_SESSION_ID, turn, "https://api.example.com")
        
        # Assert - no exception raised (warning logged internally)



class TestSessionManagerErrorHandling:
    """Tests for error handling in SessionManager."""

    @pytest.mark.asyncio
    async def test_create_session_database_error(self):
        """Test that database errors during session creation are logged and raised."""
        # Arrange
        pool = MagicMock()
        conn = MagicMock()
        
        # Create a proper async mock that raises on execute
        async def mock_execute(*args, **kwargs):
            raise Exception("Database connection failed")
        
        conn.execute = mock_execute
        
        # Mock the async context manager for acquire()
        # __aexit__ must return False to propagate exceptions
        async def mock_aexit(*args):
            return False
        
        pool.acquire.return_value.__aenter__ = AsyncMock(return_value=conn)
        pool.acquire.return_value.__aexit__ = mock_aexit
        
        manager = SessionManager(db_pool=pool)

        # Act & Assert
        with pytest.raises(Exception, match="Database connection failed"):
            await manager.create_session(
                project_id=TEST_PROJECT_ID,
                room_name=TEST_ROOM_NAME,
            )

    @pytest.mark.asyncio
    async def test_get_session_database_error(self):
        """Test that database errors during session retrieval are logged and raised."""
        # Arrange
        pool = MagicMock()
        conn = MagicMock()
        
        # Mock execute for SET statement_timeout
        conn.execute = AsyncMock()
        
        # Create a proper async mock that raises on fetchrow
        async def mock_fetchrow(*args, **kwargs):
            raise Exception("Database query failed")
        
        conn.fetchrow = mock_fetchrow
        
        # Mock the async context manager for acquire()
        # __aexit__ must return False to propagate exceptions
        async def mock_aexit(*args):
            return False
        
        pool.acquire.return_value.__aenter__ = AsyncMock(return_value=conn)
        pool.acquire.return_value.__aexit__ = mock_aexit
        
        manager = SessionManager(db_pool=pool)

        # Act & Assert
        with pytest.raises(Exception, match="Database query failed"):
            await manager.get_session(session_id=TEST_SESSION_ID)

    @pytest.mark.asyncio
    async def test_add_turn_database_error(self):
        """Test that database errors during turn addition are logged and raised."""
        # Arrange
        pool = MagicMock()
        conn = MagicMock()
        
        # Create a proper async mock that raises on execute
        async def mock_execute(*args, **kwargs):
            raise Exception("Database insert failed")
        
        conn.execute = mock_execute
        
        # Mock the async context manager for acquire()
        # __aexit__ must return False to propagate exceptions
        async def mock_aexit(*args):
            return False
        
        pool.acquire.return_value.__aenter__ = AsyncMock(return_value=conn)
        pool.acquire.return_value.__aexit__ = mock_aexit
        
        manager = SessionManager(db_pool=pool)

        turn = Turn(
            turn_id="turn-123",
            session_id=TEST_SESSION_ID,
            user_query="Test query",
            agent_response="Test response",
            rag_documents=[],
            timestamp=FIXED_TIMESTAMP,
        )

        # Act & Assert
        with pytest.raises(Exception, match="Database insert failed"):
            await manager.add_turn(session_id=TEST_SESSION_ID, turn=turn)

    @pytest.mark.asyncio
    async def test_log_to_api_network_error_does_not_raise(self):
        """Test that API logging errors are logged but don't raise exceptions."""
        # Arrange
        pool = MagicMock()
        manager = SessionManager(db_pool=pool)

        turn = Turn(
            turn_id="turn-123",
            session_id=TEST_SESSION_ID,
            user_query="Test query",
            agent_response="Test response",
            rag_documents=[],
            timestamp=FIXED_TIMESTAMP,
        )

        # Mock httpx to raise an exception
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=Exception("Network error")
            )

            # Act - should not raise exception
            await manager.log_to_api(
                session_id=TEST_SESSION_ID,
                turn=turn,
                api_url="https://api.example.com",
            )

            # Assert - method completed without raising

    @pytest.mark.asyncio
    async def test_log_to_api_timeout_does_not_raise(self):
        """Test that API logging timeouts are logged but don't raise exceptions."""
        # Arrange
        pool = MagicMock()
        manager = SessionManager(db_pool=pool)

        turn = Turn(
            turn_id="turn-123",
            session_id=TEST_SESSION_ID,
            user_query="Test query",
            agent_response="Test response",
            rag_documents=[],
            timestamp=FIXED_TIMESTAMP,
        )

        # Mock httpx to timeout
        import httpx
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=httpx.TimeoutException("Request timeout")
            )

            # Act - should not raise exception
            await manager.log_to_api(
                session_id=TEST_SESSION_ID,
                turn=turn,
                api_url="https://api.example.com",
            )

            # Assert - method completed without raising
