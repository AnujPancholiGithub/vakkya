"""Session state management for voice conversations."""

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
            project_id: Project identifier
            room_name: LiveKit room name
            
        Returns:
            Created session with generated ID and timestamp
        """
        session = Session.create(project_id=project_id, room_name=room_name)
        
        async with self.db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO voice_sessions 
                (session_id, project_id, room_name, page_url, created_at, status)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                session.session_id,
                session.project_id,
                session.room_name,
                None,  # page_url initially null
                session.created_at,
                session.status,
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
            session_id: Session identifier
            
        Returns:
            Session if found, None otherwise
        """
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT session_id, project_id, room_name, page_url, created_at, status
                FROM voice_sessions
                WHERE session_id = $1
                """,
                session_id,
            )
            
            if not row:
                return None
            
            # Fetch conversation history (last 3 turns)
            turns_rows = await conn.fetch(
                """
                SELECT turn_id, session_id, user_query, agent_response, 
                       rag_documents, timestamp
                FROM conversation_turns
                WHERE session_id = $1
                ORDER BY timestamp DESC
                LIMIT 3
                """,
                session_id,
            )
            
            # Build session object
            page_context = PageContext(url=row["page_url"]) if row["page_url"] else None
            
            turns = [
                Turn(
                    turn_id=turn_row["turn_id"],
                    session_id=turn_row["session_id"],
                    user_query=turn_row["user_query"],
                    agent_response=turn_row["agent_response"],
                    rag_documents=turn_row["rag_documents"] or [],
                    timestamp=turn_row["timestamp"],
                )
                for turn_row in reversed(turns_rows)  # Reverse to get chronological order
            ]
            
            return Session(
                session_id=row["session_id"],
                project_id=row["project_id"],
                room_name=row["room_name"],
                page_context=page_context,
                conversation_history=turns,
                created_at=row["created_at"],
                status=row["status"],
            )

    async def update_page_context(self, session_id: str, page_context: PageContext) -> None:
        """
        Update the page context for a session.
        
        Args:
            session_id: Session identifier
            page_context: Page context to store
        """
        async with self.db_pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE voice_sessions
                SET page_url = $1
                WHERE session_id = $2
                """,
                page_context.url,
                session_id,
            )
        
        logger.info(
            "Page context updated",
            extra={
                "session_id": session_id,
                "page_url": page_context.url,
            },
        )

    async def add_turn(self, session_id: str, turn: Turn) -> None:
        """
        Add a conversation turn to the session history.
        
        Args:
            session_id: Session identifier
            turn: Conversation turn to add
        """
        async with self.db_pool.acquire() as conn:
            # Store RAG documents as JSONB
            rag_docs_json = [
                {"content": doc.content, "metadata": doc.metadata}
                for doc in turn.rag_documents
            ]
            
            await conn.execute(
                """
                INSERT INTO conversation_turns
                (turn_id, session_id, user_query, agent_response, rag_documents, timestamp)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                turn.turn_id,
                turn.session_id,
                turn.user_query,
                turn.agent_response,
                rag_docs_json,
                turn.timestamp,
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
        
        Args:
            session_id: Session identifier
        """
        async with self.db_pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE voice_sessions
                SET status = 'completed'
                WHERE session_id = $1
                """,
                session_id,
            )
        
        logger.info(
            "Session completed",
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
