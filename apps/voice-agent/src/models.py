"""Core data models for the Voice Agent Service."""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


# ============================================================================
# Domain Models (Dataclasses)
# ============================================================================


@dataclass
class PageContext:
    """Context about the page the user is viewing."""

    url: str


@dataclass
class DocumentChunk:
    """A chunk of document content from RAG search."""

    chunk_id: str
    content: str
    document_id: str
    similarity_score: float


@dataclass
class Turn:
    """A single turn in the conversation (user query + agent response)."""

    turn_id: str
    session_id: str
    user_query: str
    agent_response: str
    rag_documents: list[DocumentChunk]
    timestamp: datetime


@dataclass
class Session:
    """A voice conversation session."""

    session_id: str
    project_id: str
    room_name: str
    page_context: PageContext | None
    conversation_history: list[Turn] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    status: Literal["active", "completed"] = "active"


@dataclass
class Context:
    """Combined context for LLM prompt generation."""

    query: str
    page_context: PageContext | None
    rag_documents: list[DocumentChunk]
    conversation_history: list[Turn]


# ============================================================================
# Input Validation Models (Pydantic)
# ============================================================================


class PageContextInput(BaseModel):
    """Validated input for page context from widget."""

    url: str = Field(..., min_length=1, max_length=2048, description="Page URL")

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate URL format."""
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class DataChannelMessage(BaseModel):
    """Validated message from widget data channel."""

    type: Literal["page_context"] = Field(..., description="Message type")
    data: PageContextInput = Field(..., description="Message payload")

    model_config = {"extra": "forbid"}


class TurnInput(BaseModel):
    """Validated input for creating a turn."""

    user_query: str = Field(
        ..., min_length=1, max_length=10000, description="User's spoken query"
    )
    agent_response: str = Field(
        ..., min_length=1, max_length=50000, description="Agent's response"
    )

    @field_validator("user_query", "agent_response")
    @classmethod
    def validate_not_empty(cls, v: str) -> str:
        """Ensure strings are not just whitespace."""
        if not v.strip():
            raise ValueError("Field cannot be empty or whitespace only")
        return v


class SessionInput(BaseModel):
    """Validated input for creating a session."""

    room_name: str = Field(
        ..., min_length=1, max_length=255, description="LiveKit room name"
    )
    project_id: str = Field(
        ..., min_length=1, max_length=255, description="Project identifier"
    )

    @field_validator("room_name", "project_id")
    @classmethod
    def validate_not_empty(cls, v: str) -> str:
        """Ensure strings are not just whitespace."""
        if not v.strip():
            raise ValueError("Field cannot be empty or whitespace only")
        return v
