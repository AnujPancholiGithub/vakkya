"""Session state management for voice conversations.

IMPORTANT: Database Schema Alignment
====================================
This module uses the existing PostgreSQL schema defined in apps/api/prisma/schema.prisma.
Prisma generates camelCase column names in PostgreSQL (not snake_case).

Schema Reference:
-----------------
conversations table:
  - id (TEXT, PK)
  - projectId (TEXT, FK to projects.id)
  - sessionId (TEXT) - stores LiveKit room name
  - startedAt (TIMESTAMP)
  - turnCount (INTEGER)

conversation_turns table:
  - id (TEXT, PK)
  - conversationId (TEXT, FK to conversations.id)
  - userQuery (TEXT)
  - agentResponse (TEXT)
  - timestamp (TIMESTAMP)

ALWAYS use quoted identifiers with camelCase: "projectId", "sessionId", etc.
See: apps/api/prisma/migrations/20241118000000_init/migration.sql
"""

import logging
from typing import Optional

import asyncpg
import httpx

from .models import PageContext, Session, Turn

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages conversation session state in PostgreSQL.
    
    Error Handling Strategy:
    - Database operations (create_session, get_session, add_turn): Raise exceptions
    - API logging (log_to_api): Swallow exceptions (fire-and-forget, non-critical)
    """
    
    # Configuration constants
    MAX_CONVERSATION_HISTORY = 3
    API_TIMEOUT_SECONDS = 5.0
    DB_STATEMENT_TIMEOUT_MS = 5000  # 5 seconds for database queries

    def __init__(self, db_pool: Optional[asyncpg.Pool] = None):
        """
        Initialize session manager with optional database connection pool.
        
        Args:
            db_pool: PostgreSQL connection pool (optional for API-only usage)
        """
        self.db_pool = db_pool

    async def create_session(self, project_id: str, room_name: str) -> Session:
        """
        Create a new voice conversation session.
        
        Args:
            project_id: Project identifier (must match existing project in database)
            room_name: LiveKit room name (stored as sessionId in conversations table)
            
        Returns:
            Created session with generated ID and timestamp
            
        Raises:
            RuntimeError: If db_pool is not configured
            Exception: If database operation fails
        """
        if self.db_pool is None:
            raise RuntimeError("Database pool not configured")
        
        session = Session.create(project_id=project_id, room_name=room_name)
        
        try:
            async with self.db_pool.acquire() as conn:
                # Set statement timeout to prevent long-running queries
                await conn.execute(f"SET statement_timeout = '{self.DB_STATEMENT_TIMEOUT_MS}'")
                
                # Use existing conversations table from API schema
                # Note: Prisma uses camelCase column names in PostgreSQL
                await conn.execute(
                    """
                    INSERT INTO conversations 
                    ("id", "projectId", "sessionId", "startedAt", "turnCount")
                    VALUES ($1, $2, $3, $4, $5)
                    """,
                    session.session_id,
                    session.project_id,
                    room_name,  # Store LiveKit room name as sessionId
                    session.created_at,
                    0,  # Initial turn count
                )
            
            logger.info(
                "Session created",
                extra={
                    "session_id": session.session_id,
                    "project_id": project_id,
                    "room_name": room_name,
                },
            )
            
            return session
        except Exception as e:
            logger.error(
                "Failed to create session in database",
                extra={
                    "session_id": session.session_id,
                    "project_id": project_id,
                    "room_name": room_name,
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
                exc_info=True,
            )
            raise

    async def get_session(self, session_id: str) -> Optional[Session]:
        """
        Retrieve a session by ID.
        
        Args:
            session_id: Session identifier (conversation.id)
            
        Returns:
            Session if found, None otherwise
            
        Raises:
            RuntimeError: If db_pool is not configured
            Exception: If database operation fails
        """
        if self.db_pool is None:
            raise RuntimeError("Database pool not configured")
        
        try:
            async with self.db_pool.acquire() as conn:
                # Set statement timeout to prevent long-running queries
                await conn.execute(f"SET statement_timeout = '{self.DB_STATEMENT_TIMEOUT_MS}'")
                
                # Use existing conversations table with camelCase column names
                row = await conn.fetchrow(
                    """
                    SELECT "id", "projectId", "sessionId", "startedAt", "turnCount"
                    FROM conversations
                    WHERE "id" = $1
                    """,
                    session_id,
                )
                
                if not row:
                    logger.debug(
                        "Session not found",
                        extra={"session_id": session_id},
                    )
                    return None
                
                # Fetch conversation history (last 3 turns)
                turns_rows = await conn.fetch(
                    """
                    SELECT "id", "conversationId", "userQuery", "agentResponse", "timestamp"
                    FROM conversation_turns
                    WHERE "conversationId" = $1
                    ORDER BY "timestamp" DESC
                    LIMIT $2
                    """,
                    session_id,
                    self.MAX_CONVERSATION_HISTORY,
                )
                
                # Build session object (no page_context stored in DB yet - will add in task 7)
                turns = [
                    Turn(
                        turn_id=turn_row["id"],
                        session_id=turn_row["conversationId"],
                        user_query=turn_row["userQuery"],
                        agent_response=turn_row["agentResponse"],
                        rag_documents=[],  # No RAG documents stored yet
                        timestamp=turn_row["timestamp"],
                    )
                    for turn_row in reversed(turns_rows)  # Reverse to get chronological order
                ]
                
                logger.debug(
                    "Session retrieved",
                    extra={
                        "session_id": session_id,
                        "project_id": row["projectId"],
                        "turn_count": len(turns),
                    },
                )
                
                return Session(
                    session_id=row["id"],
                    project_id=row["projectId"],
                    room_name=row["sessionId"],  # sessionId stores the LiveKit room name
                    page_context=None,  # Will be added in task 7
                    conversation_history=turns,
                    created_at=row["startedAt"],
                    status="active",  # Default status (not stored in DB)
                )
        except Exception as e:
            logger.error(
                "Failed to retrieve session from database",
                extra={
                    "session_id": session_id,
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
                exc_info=True,
            )
            raise

    async def update_page_context(self, session_id: str, page_context: PageContext) -> None:
        """
        Update the page context for a session.
        
        Note: Page context is not stored in DB for MVP - kept in memory only.
        Data channel handling is implemented in entrypoint.py (task 7 complete).
        This method exists for future enhancement when page context persistence is needed.
        
        Args:
            session_id: Session identifier
            page_context: Page context to store
        """
        logger.debug(
            "Page context received (not persisted in MVP)",
            extra={
                "session_id": session_id,
                "page_url": page_context.url,
            },
        )

    async def add_turn(self, session_id: str, turn: Turn) -> None:
        """
        Add a conversation turn to the session history.
        
        Args:
            session_id: Session identifier (conversation.id)
            turn: Conversation turn to add
            
        Raises:
            RuntimeError: If db_pool is not configured
            Exception: If database operation fails
        """
        if self.db_pool is None:
            raise RuntimeError("Database pool not configured")
        
        try:
            async with self.db_pool.acquire() as conn:
                # Set statement timeout to prevent long-running queries
                await conn.execute(f"SET statement_timeout = '{self.DB_STATEMENT_TIMEOUT_MS}'")
                
                # Use existing conversation_turns table with camelCase column names
                # Note: RAG documents are not stored in MVP schema
                await conn.execute(
                    """
                    INSERT INTO conversation_turns
                    ("id", "conversationId", "userQuery", "agentResponse", "timestamp")
                    VALUES ($1, $2, $3, $4, $5)
                    """,
                    turn.turn_id,
                    session_id,
                    turn.user_query,
                    turn.agent_response,
                    turn.timestamp,
                )
                
                # Update turn count in conversations table
                await conn.execute(
                    """
                    UPDATE conversations
                    SET "turnCount" = "turnCount" + 1
                    WHERE "id" = $1
                    """,
                    session_id,
                )
            
            logger.info(
                "Turn added to session",
                extra={
                    "session_id": session_id,
                    "turn_id": turn.turn_id,
                    "user_query_length": len(turn.user_query),
                    "agent_response_length": len(turn.agent_response),
                },
            )
        except Exception as e:
            logger.error(
                "Failed to add turn to session",
                extra={
                    "session_id": session_id,
                    "turn_id": turn.turn_id,
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
                exc_info=True,
            )
            raise

    async def complete_session(self, session_id: str) -> None:
        """
        Mark a session as completed.
        
        Note: The conversations table doesn't have a status field in MVP.
        This is a no-op for now, kept for future enhancement when session
        lifecycle tracking is needed.
        
        Args:
            session_id: Session identifier
        """
        logger.debug(
            "Session completed (status not persisted in MVP)",
            extra={"session_id": session_id},
        )

    async def create_api_conversation(
        self,
        project_id: str,
        session_id: str,
        widget_token: str,
        api_url: str,
    ) -> Optional[str]:
        """
        Create a conversation in the API server.
        
        This should be called at the start of a voice session to create
        a conversation record that turns can be logged to.
        
        Args:
            project_id: Project identifier
            session_id: LiveKit room name / session identifier
            widget_token: Widget token for authentication
            api_url: API server base URL
            
        Returns:
            Conversation ID if created successfully, None otherwise
        """
        
        try:
            payload = {
                "projectId": project_id,
                "sessionId": session_id,
                "widgetToken": widget_token,
            }
            
            async with httpx.AsyncClient(timeout=self.API_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    f"{api_url}/conversations",
                    json=payload,
                )
                
                if response.status_code == 201:
                    data = response.json()
                    conversation_id = data.get("conversation", {}).get("id")
                    logger.info(
                        "API conversation created",
                        extra={
                            "project_id": project_id,
                            "session_id": session_id,
                            "conversation_id": conversation_id,
                        },
                    )
                    return conversation_id
                else:
                    logger.warning(
                        "Failed to create API conversation",
                        extra={
                            "project_id": project_id,
                            "session_id": session_id,
                            "status_code": response.status_code,
                            "response": response.text[:200] if response.text else None,
                        },
                    )
                    return None
        except Exception as e:
            # Don't fail the voice session if API logging fails
            logger.error(
                "Error creating API conversation",
                extra={
                    "project_id": project_id,
                    "session_id": session_id,
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
            )
            return None

    async def log_turn_to_api(
        self,
        conversation_id: str,
        turn: Turn,
        widget_token: str,
        api_url: str,
    ) -> bool:
        """
        Log a conversation turn to the API server.
        
        This sends the turn data to the main API for storage and analytics.
        
        Args:
            conversation_id: API conversation ID (from create_api_conversation)
            turn: Conversation turn to log
            widget_token: Widget token for authentication
            api_url: API server base URL
            
        Returns:
            True if logged successfully, False otherwise
        """
        
        try:
            payload = {
                "userQuery": turn.user_query,
                "agentResponse": turn.agent_response,
                "widgetToken": widget_token,
            }
            
            async with httpx.AsyncClient(timeout=self.API_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    f"{api_url}/conversations/{conversation_id}/turns",
                    json=payload,
                )
                
                if response.status_code == 201:
                    logger.debug(
                        "Turn logged to API",
                        extra={
                            "conversation_id": conversation_id,
                            "turn_id": turn.turn_id,
                        },
                    )
                    return True
                else:
                    logger.warning(
                        "Failed to log turn to API",
                        extra={
                            "conversation_id": conversation_id,
                            "turn_id": turn.turn_id,
                            "status_code": response.status_code,
                        },
                    )
                    return False
        except Exception as e:
            # Don't fail the conversation if logging fails
            logger.error(
                "Error logging turn to API",
                extra={
                    "conversation_id": conversation_id,
                    "turn_id": turn.turn_id,
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
            )
            return False

    # Legacy method for backwards compatibility
    async def log_to_api(self, session_id: str, turn: Turn, api_url: str) -> None:
        """
        Legacy method - use log_turn_to_api instead.
        
        This method is kept for backwards compatibility but does nothing
        since it doesn't have the required conversation_id and widget_token.
        """
        logger.warning(
            "log_to_api called without conversation_id - use log_turn_to_api instead",
            extra={"session_id": session_id, "turn_id": turn.turn_id},
        )
