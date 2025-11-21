"""Tests for data models."""

from datetime import UTC, datetime
from uuid import UUID

import pytest
from pydantic import ValidationError

from src.models import (
    Context,
    DocumentChunk,
    PageContext,
    PageContextInput,
    ProjectMetadata,
    RAGQuery,
    Session,
    Turn,
)


# ============================================================================
# Tests for Core Data Models
# ============================================================================


class TestPageContext:
    """Tests for PageContext dataclass."""

    def test_create_page_context(self):
        """Test creating a page context."""
        context = PageContext(url="https://example.com/page")
        assert context.url == "https://example.com/page"


class TestDocumentChunk:
    """Tests for DocumentChunk dataclass."""

    def test_create_document_chunk(self):
        """Test creating a document chunk."""
        chunk = DocumentChunk(
            content="This is some content",
            metadata={"source": "doc1.pdf", "page": "1"},
        )
        assert chunk.content == "This is some content"
        assert chunk.metadata["source"] == "doc1.pdf"
        assert chunk.metadata["page"] == "1"

    def test_create_document_chunk_without_metadata(self):
        """Test creating a document chunk without metadata."""
        chunk = DocumentChunk(content="Content only")
        assert chunk.content == "Content only"
        assert chunk.metadata == {}


class TestTurn:
    """Tests for Turn dataclass."""

    def test_create_turn_manually(self):
        """Test creating a turn manually."""
        now = datetime.now(UTC)
        turn = Turn(
            turn_id="turn-123",
            session_id="session-456",
            user_query="What is the weather?",
            agent_response="It's sunny today.",
            rag_documents=[],
            timestamp=now,
        )
        assert turn.turn_id == "turn-123"
        assert turn.session_id == "session-456"
        assert turn.user_query == "What is the weather?"
        assert turn.agent_response == "It's sunny today."
        assert turn.rag_documents == []
        assert turn.timestamp == now

    def test_create_turn_with_factory(self):
        """Test creating a turn using factory method."""
        turn = Turn.create(
            session_id="session-789",
            user_query="How do I reset my password?",
            agent_response="Click the forgot password link.",
        )
        # Verify generated fields
        assert UUID(turn.turn_id)  # Valid UUID
        assert turn.session_id == "session-789"
        assert turn.user_query == "How do I reset my password?"
        assert turn.agent_response == "Click the forgot password link."
        assert turn.rag_documents == []
        assert isinstance(turn.timestamp, datetime)

    def test_create_turn_with_rag_documents(self):
        """Test creating a turn with RAG documents."""
        chunks = [
            DocumentChunk(content="Chunk 1", metadata={"source": "doc1"}),
            DocumentChunk(content="Chunk 2", metadata={"source": "doc2"}),
        ]
        turn = Turn.create(
            session_id="session-abc",
            user_query="Tell me about X",
            agent_response="X is...",
            rag_documents=chunks,
        )
        assert len(turn.rag_documents) == 2
        assert turn.rag_documents[0].content == "Chunk 1"
        assert turn.rag_documents[1].content == "Chunk 2"


class TestSession:
    """Tests for Session dataclass."""

    def test_create_session_manually(self):
        """Test creating a session manually."""
        now = datetime.now(UTC)
        session = Session(
            session_id="session-123",
            project_id="project-456",
            room_name="room-789",
            page_context=PageContext(url="https://example.com"),
            conversation_history=[],
            created_at=now,
            status="active",
        )
        assert session.session_id == "session-123"
        assert session.project_id == "project-456"
        assert session.room_name == "room-789"
        assert session.page_context.url == "https://example.com"
        assert session.conversation_history == []
        assert session.created_at == now
        assert session.status == "active"

    def test_create_session_with_factory(self):
        """Test creating a session using factory method."""
        session = Session.create(project_id="project-abc", room_name="room-def")
        # Verify generated fields
        assert UUID(session.session_id)  # Valid UUID
        assert session.project_id == "project-abc"
        assert session.room_name == "room-def"
        assert session.page_context is None
        assert session.conversation_history == []
        assert isinstance(session.created_at, datetime)
        assert session.status == "active"

    def test_session_status_types(self):
        """Test session status literal types."""
        session = Session.create(project_id="proj-1", room_name="room-1")
        session.status = "active"
        assert session.status == "active"

        session.status = "completed"
        assert session.status == "completed"


class TestContext:
    """Tests for Context dataclass."""

    def test_create_context(self):
        """Test creating a context."""
        page_ctx = PageContext(url="https://example.com")
        chunks = [DocumentChunk(content="Info about X")]
        turns = [
            Turn.create(
                session_id="s1",
                user_query="What is X?",
                agent_response="X is...",
            )
        ]

        context = Context(
            query="Tell me more about X",
            page_context=page_ctx,
            rag_documents=chunks,
            conversation_history=turns,
        )

        assert context.query == "Tell me more about X"
        assert context.page_context.url == "https://example.com"
        assert len(context.rag_documents) == 1
        assert len(context.conversation_history) == 1


# ============================================================================
# Tests for Pydantic Validation Models
# ============================================================================


class TestPageContextInput:
    """Tests for PageContextInput validation."""

    def test_valid_http_url(self):
        """Test valid HTTP URL."""
        input_data = PageContextInput(url="http://example.com/page")
        assert input_data.url == "http://example.com/page"

    def test_valid_https_url(self):
        """Test valid HTTPS URL."""
        input_data = PageContextInput(url="https://example.com/page")
        assert input_data.url == "https://example.com/page"

    def test_invalid_url_no_protocol(self):
        """Test invalid URL without protocol."""
        with pytest.raises(ValidationError) as exc_info:
            PageContextInput(url="example.com")
        assert "URL must start with http:// or https://" in str(exc_info.value)

    def test_invalid_url_empty(self):
        """Test invalid empty URL."""
        with pytest.raises(ValidationError) as exc_info:
            PageContextInput(url="")
        assert "at least 1 character" in str(exc_info.value).lower()

    def test_invalid_url_too_long(self):
        """Test invalid URL that's too long."""
        long_url = "https://example.com/" + "a" * 2048
        with pytest.raises(ValidationError) as exc_info:
            PageContextInput(url=long_url)
        assert "at most 2048 characters" in str(exc_info.value).lower()

    def test_invalid_url_localhost(self):
        """Test invalid localhost URL (SSRF protection)."""
        with pytest.raises(ValidationError) as exc_info:
            PageContextInput(url="http://localhost:3000/admin")
        assert "Internal URLs are not allowed" in str(exc_info.value)

    def test_invalid_url_127_0_0_1(self):
        """Test invalid 127.0.0.1 URL (SSRF protection)."""
        with pytest.raises(ValidationError) as exc_info:
            PageContextInput(url="http://127.0.0.1:8080/api")
        assert "Internal URLs are not allowed" in str(exc_info.value)


class TestProjectMetadata:
    """Tests for ProjectMetadata validation."""

    def test_valid_project_id(self):
        """Test valid project ID (UUID format)."""
        input_data = ProjectMetadata(project_id="550e8400-e29b-41d4-a716-446655440000")
        assert input_data.project_id == "550e8400-e29b-41d4-a716-446655440000"

    def test_invalid_project_id_not_uuid(self):
        """Test invalid project ID (not UUID format)."""
        with pytest.raises(ValidationError) as exc_info:
            ProjectMetadata(project_id="not-a-uuid")
        assert "must be a valid UUID" in str(exc_info.value)

    def test_valid_project_id_uppercase(self):
        """Test valid project ID with uppercase letters."""
        input_data = ProjectMetadata(project_id="550E8400-E29B-41D4-A716-446655440000")
        assert input_data.project_id == "550E8400-E29B-41D4-A716-446655440000"

    def test_invalid_project_id_empty(self):
        """Test invalid empty project ID."""
        with pytest.raises(ValidationError) as exc_info:
            ProjectMetadata(project_id="")
        assert "at least 1 character" in str(exc_info.value).lower()


class TestRAGQuery:
    """Tests for RAGQuery validation."""

    def test_valid_rag_query(self):
        """Test valid RAG query."""
        query = RAGQuery(
            query="What is the weather?",
            project_id="550e8400-e29b-41d4-a716-446655440000",
        )
        assert query.query == "What is the weather?"
        assert query.project_id == "550e8400-e29b-41d4-a716-446655440000"
        assert query.top_k == 3  # Default value

    def test_valid_rag_query_with_custom_top_k(self):
        """Test valid RAG query with custom top_k."""
        query = RAGQuery(
            query="Tell me about X",
            project_id="550e8400-e29b-41d4-a716-446655440000",
            top_k=5,
        )
        assert query.top_k == 5

    def test_invalid_query_empty(self):
        """Test invalid empty query."""
        with pytest.raises(ValidationError) as exc_info:
            RAGQuery(
                query="",
                project_id="550e8400-e29b-41d4-a716-446655440000",
            )
        assert "at least 1 character" in str(exc_info.value).lower()

    def test_invalid_query_too_long(self):
        """Test invalid query that's too long."""
        long_query = "a" * 1001
        with pytest.raises(ValidationError) as exc_info:
            RAGQuery(
                query=long_query,
                project_id="550e8400-e29b-41d4-a716-446655440000",
            )
        assert "at most 1000 characters" in str(exc_info.value).lower()

    def test_invalid_top_k_too_small(self):
        """Test invalid top_k that's too small."""
        with pytest.raises(ValidationError) as exc_info:
            RAGQuery(
                query="What is X?",
                project_id="550e8400-e29b-41d4-a716-446655440000",
                top_k=0,
            )
        assert "greater than or equal to 1" in str(exc_info.value).lower()

    def test_invalid_top_k_too_large(self):
        """Test invalid top_k that's too large."""
        with pytest.raises(ValidationError) as exc_info:
            RAGQuery(
                query="What is X?",
                project_id="550e8400-e29b-41d4-a716-446655440000",
                top_k=11,
            )
        assert "less than or equal to 10" in str(exc_info.value).lower()
