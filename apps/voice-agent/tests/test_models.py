"""Tests for core data models."""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from src.models import (
    Context,
    DataChannelMessage,
    DocumentChunk,
    PageContext,
    PageContextInput,
    Session,
    SessionInput,
    Turn,
    TurnInput,
)


# ============================================================================
# Domain Model Tests
# ============================================================================


def test_page_context_creation():
    """Test PageContext dataclass creation."""
    page = PageContext(url="https://example.com/page")
    assert page.url == "https://example.com/page"


def test_document_chunk_creation():
    """Test DocumentChunk dataclass creation."""
    chunk = DocumentChunk(
        chunk_id="chunk-1",
        content="This is a test chunk",
        document_id="doc-1",
        similarity_score=0.95,
    )
    assert chunk.chunk_id == "chunk-1"
    assert chunk.content == "This is a test chunk"
    assert chunk.document_id == "doc-1"
    assert chunk.similarity_score == 0.95


def test_turn_creation():
    """Test Turn dataclass creation."""
    now = datetime.now(UTC)
    chunk = DocumentChunk(
        chunk_id="chunk-1",
        content="Test content",
        document_id="doc-1",
        similarity_score=0.9,
    )
    turn = Turn(
        turn_id="turn-1",
        session_id="session-1",
        user_query="What is this?",
        agent_response="This is a test.",
        rag_documents=[chunk],
        timestamp=now,
    )
    assert turn.turn_id == "turn-1"
    assert turn.session_id == "session-1"
    assert turn.user_query == "What is this?"
    assert turn.agent_response == "This is a test."
    assert len(turn.rag_documents) == 1
    assert turn.timestamp == now


def test_session_creation():
    """Test Session dataclass creation with defaults."""
    page = PageContext(url="https://example.com")
    session = Session(
        session_id="session-1",
        project_id="project-1",
        room_name="room-1",
        page_context=page,
    )
    assert session.session_id == "session-1"
    assert session.project_id == "project-1"
    assert session.room_name == "room-1"
    assert session.page_context == page
    assert session.conversation_history == []
    assert session.status == "active"
    assert isinstance(session.created_at, datetime)


def test_session_with_conversation_history():
    """Test Session with conversation history."""
    now = datetime.now(UTC)
    turn = Turn(
        turn_id="turn-1",
        session_id="session-1",
        user_query="Hello",
        agent_response="Hi there!",
        rag_documents=[],
        timestamp=now,
    )
    session = Session(
        session_id="session-1",
        project_id="project-1",
        room_name="room-1",
        page_context=None,
        conversation_history=[turn],
    )
    assert len(session.conversation_history) == 1
    assert session.conversation_history[0] == turn


def test_context_creation():
    """Test Context dataclass creation."""
    page = PageContext(url="https://example.com")
    chunk = DocumentChunk(
        chunk_id="chunk-1",
        content="Test",
        document_id="doc-1",
        similarity_score=0.9,
    )
    turn = Turn(
        turn_id="turn-1",
        session_id="session-1",
        user_query="Previous question",
        agent_response="Previous answer",
        rag_documents=[],
        timestamp=datetime.now(UTC),
    )
    context = Context(
        query="What is this?",
        page_context=page,
        rag_documents=[chunk],
        conversation_history=[turn],
    )
    assert context.query == "What is this?"
    assert context.page_context == page
    assert len(context.rag_documents) == 1
    assert len(context.conversation_history) == 1


# ============================================================================
# Input Validation Model Tests
# ============================================================================


def test_page_context_input_valid():
    """Test valid PageContextInput."""
    input_data = PageContextInput(url="https://example.com/page")
    assert input_data.url == "https://example.com/page"


def test_page_context_input_http_url():
    """Test PageContextInput with http URL."""
    input_data = PageContextInput(url="http://localhost:3000")
    assert input_data.url == "http://localhost:3000"


def test_page_context_input_invalid_url():
    """Test PageContextInput with invalid URL."""
    with pytest.raises(ValidationError) as exc_info:
        PageContextInput(url="ftp://example.com")
    assert "URL must start with http:// or https://" in str(exc_info.value)


def test_page_context_input_empty_url():
    """Test PageContextInput with empty URL."""
    with pytest.raises(ValidationError):
        PageContextInput(url="")


def test_page_context_input_url_too_long():
    """Test PageContextInput with URL exceeding max length."""
    long_url = "https://example.com/" + "a" * 2048
    with pytest.raises(ValidationError):
        PageContextInput(url=long_url)


def test_data_channel_message_valid():
    """Test valid DataChannelMessage."""
    message = DataChannelMessage(
        type="page_context", data={"url": "https://example.com"}
    )
    assert message.type == "page_context"
    assert message.data.url == "https://example.com"


def test_data_channel_message_invalid_type():
    """Test DataChannelMessage with invalid type."""
    with pytest.raises(ValidationError):
        DataChannelMessage(type="invalid_type", data={"url": "https://example.com"})


def test_data_channel_message_extra_fields():
    """Test DataChannelMessage rejects extra fields."""
    with pytest.raises(ValidationError):
        DataChannelMessage(
            type="page_context",
            data={"url": "https://example.com"},
            extra_field="not allowed",
        )


def test_turn_input_valid():
    """Test valid TurnInput."""
    turn = TurnInput(user_query="What is this?", agent_response="This is a test.")
    assert turn.user_query == "What is this?"
    assert turn.agent_response == "This is a test."


def test_turn_input_empty_query():
    """Test TurnInput with empty query."""
    with pytest.raises(ValidationError):
        TurnInput(user_query="", agent_response="Response")


def test_turn_input_whitespace_only_query():
    """Test TurnInput with whitespace-only query."""
    with pytest.raises(ValidationError) as exc_info:
        TurnInput(user_query="   ", agent_response="Response")
    assert "cannot be empty or whitespace only" in str(exc_info.value)


def test_turn_input_query_too_long():
    """Test TurnInput with query exceeding max length."""
    long_query = "a" * 10001
    with pytest.raises(ValidationError):
        TurnInput(user_query=long_query, agent_response="Response")


def test_turn_input_response_too_long():
    """Test TurnInput with response exceeding max length."""
    long_response = "a" * 50001
    with pytest.raises(ValidationError):
        TurnInput(user_query="Query", agent_response=long_response)


def test_session_input_valid():
    """Test valid SessionInput."""
    session = SessionInput(room_name="room-123", project_id="project-456")
    assert session.room_name == "room-123"
    assert session.project_id == "project-456"


def test_session_input_empty_room_name():
    """Test SessionInput with empty room name."""
    with pytest.raises(ValidationError):
        SessionInput(room_name="", project_id="project-1")


def test_session_input_whitespace_only_project_id():
    """Test SessionInput with whitespace-only project ID."""
    with pytest.raises(ValidationError) as exc_info:
        SessionInput(room_name="room-1", project_id="   ")
    assert "cannot be empty or whitespace only" in str(exc_info.value)


def test_session_input_room_name_too_long():
    """Test SessionInput with room name exceeding max length."""
    long_name = "a" * 256
    with pytest.raises(ValidationError):
        SessionInput(room_name=long_name, project_id="project-1")
