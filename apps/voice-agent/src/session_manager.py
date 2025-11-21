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

from .models import PageContext, Session, Turn

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages conversation session state in PostgreSQL.
    
    Responsibilities:
    - Create and retrieve sessions
    - Track conversation history (last 3 turns)
    - Log conversations to API server
    """

    def __init__(self, db_pool: asyncpg.Pool):
        """
        Initialize session manager with database connection pool.
        
        Args:
            db_pool: PostgreSQL connection pool
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
        """
        session = Session.create(project_id=project_id, room_name=room_name)
        
        async with self.db_pool.acquire() as conn:
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

    async def get_session(self, session_id: str) -> Optional[Session]:
        """
        Retrieve a session by ID.
        
        Args:
            session_id: Session identifier (conversation.id)
            
        Returns:
            Session if found, None otherwise
        """
        async with self.db_pool.acquire() as conn:
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
                return None
            
            # Fetch conversation history (last 3 turns)
            turns_rows = await conn.fetch(
                """
                SELECT "id", "conversationId", "userQuery", "agentResponse", "timestamp"
                FROM conversation_turns
                WHERE "conversationId" = $1
                ORDER BY "timestamp" DESC
                LIMIT 3
                """,
                session_id,
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
            
            return Session(
                session_id=row["id"],
                project_id=row["projectId"],
                room_name=row["sessionId"],  # sessionId stores the LiveKit room name
                page_context=None,  # Will be added in task 7
                conversation_history=turns,
                created_at=row["startedAt"],
                status="active",  # Default status (not stored in DB)
            )

    async def update_page_context(self, session_id: str, page_context: PageContext) -> None:
        """
        Update the page context for a session.
        
        Note: Page context is not stored in DB for MVP - kept in memory only.
        This method is a placeholder for task 7 (data channel handling).
        
        Args:
            session_id: Session identifier
            page_context: Page context to store
        """
        # TODO: Task 7 - Store page context when implementing data channel handling
        logger.info(
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
        """
        async with self.db_pool.acquire() as conn:
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

    async def complete_session(self, session_id: str) -> None:
        """
        Mark a session as completed.
        
        Note: The conversations table doesn't have a status field in MVP.
        This is a no-op for now, kept for future enhancement.
        
        Args:
            session_id: Session identifier
        """
        # TODO: Add status field to conversations table if needed
        logger.info(
            "Session completed (status not persisted in MVP)",
            extra={"session_id": session_id},
        )

    async def log_to_api(self, session_id: str, turn: Turn, api_url: str) -> None:
        """
        Log a conversation turn to the API server.
        
        This sends the turn data to the main API for storage and analytics.
        
        Args:
            session_id: Session identifier
            turn: Conversation turn to log
            api_url: API server base URL
        """
        import httpx
        
        try:
            payload = {
                "session_id": session_id,
                "turn_id": turn.turn_id,
                "user_query": turn.user_query,
                "agent_response": turn.agent_response,
                "timestamp": turn.timestamp.isoformat(),
            }
            
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    f"{api_url}/api/conversations/log",
                    json=payload,
                )
                
                if response.status_code != 200:
                    logger.warning(
                        "Failed to log turn to API",
                        extra={
                            "session_id": session_id,
                            "turn_id": turn.turn_id,
                            "status_code": response.status_code,
                        },
                    )
                else:
                    logger.debug(
                        "Turn logged to API",
                        extra={
                            "session_id": session_id,
                            "turn_id": turn.turn_id,
                        },
                    )
        except Exception as e:
            # Don't fail the conversation if logging fails
            logger.error(
                "Error logging turn to API",
                extra={
                    "session_id": session_id,
                    "turn_id": turn.turn_id,
                    "error": str(e),
                },
            )
