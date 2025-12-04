"""Data models for the Voice Agent Service."""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


# ============================================================================
# Core Data Models (dataclasses for internal use)
# ============================================================================


@dataclass
class PageContext:
    """Context about the page the user is viewing."""

    url: str


@dataclass
class AgentConfig:
    """Custom agent configuration from project settings."""

    system_prompt: Optional[str] = None
    agent_name: Optional[str] = None


@dataclass
class SessionContext:
    """
    Session-level context stored in AgentSession.userdata.
    
    This context is accessible in agent tools via RunContext parameter
    and persists throughout the session lifecycle.
    """

    project_id: str
    page_context: Optional[PageContext] = None
    # API conversation tracking (for logging turns)
    api_conversation_id: Optional[str] = None
    widget_token: Optional[str] = None
    # Custom agent configuration
    agent_config: Optional[AgentConfig] = None
    # Form support - active form schema and room reference for widget messaging
    active_form: Optional[dict] = None
    room: Optional[object] = None  # rtc.Room reference
    # Capability registry for dynamic tool and instruction management
    capability_registry: Optional[object] = None  # CapabilityRegistry reference


@dataclass
class DocumentChunk:
    """A chunk of document content from RAG search."""

    content: str
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass
class Turn:
    """A single conversation turn (user query + agent response)."""

    turn_id: str
    session_id: str
    user_query: str
    agent_response: str
    rag_documents: list[DocumentChunk]
    timestamp: datetime

    @staticmethod
    def create(
        session_id: str,
        user_query: str,
        agent_response: str,
        rag_documents: list[DocumentChunk] | None = None,
    ) -> "Turn":
        """Create a new turn with generated ID and timestamp."""
        return Turn(
            turn_id=str(uuid4()),
            session_id=session_id,
            user_query=user_query,
            agent_response=agent_response,
            rag_documents=rag_documents or [],
            timestamp=datetime.now(UTC),
        )


@dataclass
class Session:
    """A voice conversation session."""

    session_id: str
    project_id: str
    room_name: str
    page_context: Optional[PageContext]
    conversation_history: list[Turn]
    created_at: datetime
    status: Literal["active", "completed"]

    @staticmethod
    def create(project_id: str, room_name: str) -> "Session":
        """Create a new session with generated ID and timestamp."""
        return Session(
            session_id=str(uuid4()),
            project_id=project_id,
            room_name=room_name,
            page_context=None,
            conversation_history=[],
            created_at=datetime.now(UTC),
            status="active",
        )


@dataclass
class Context:
    """Combined context for LLM including query, page, and RAG results."""

    query: str
    page_context: Optional[PageContext]
    rag_documents: list[DocumentChunk]
    conversation_history: list[Turn]  # Last 3 turns


# ============================================================================
# Pydantic Models (for input validation)
# ============================================================================


class PageContextInput(BaseModel):
    """Validated input for page context from widget."""

    url: str = Field(..., min_length=1, max_length=2048)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate URL format and block internal addresses."""
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")

        # Block internal/localhost URLs to prevent SSRF
        from urllib.parse import urlparse

        parsed = urlparse(v)
        if parsed.hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
            raise ValueError("Internal URLs are not allowed")

        return v


class ProjectMetadata(BaseModel):
    """Validated project metadata from room."""

    project_id: str = Field(..., min_length=1, max_length=100)

    @field_validator("project_id")
    @classmethod
    def validate_project_id(cls, v: str) -> str:
        """Validate project ID format (UUID)."""
        from uuid import UUID

        try:
            UUID(v)
        except (ValueError, AttributeError):
            raise ValueError("project_id must be a valid UUID")
        return v


class RAGQuery(BaseModel):
    """Validated RAG search query."""

    query: str = Field(..., min_length=1, max_length=1000)
    project_id: str = Field(..., min_length=1, max_length=100)
    top_k: int = Field(default=3, ge=1, le=10)
