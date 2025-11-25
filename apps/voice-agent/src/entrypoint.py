"""Main entrypoint for LiveKit agent worker."""

import logging
from typing import Optional

from livekit import rtc
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RunContext,
    function_tool,
    inference,
)
from livekit.plugins import silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from livekit.agents import ConversationItemAddedEvent

from .config import get_config
from .models import PageContext, SessionContext, Turn
from .rag_service import RAGService, create_rag_service
from .session_manager import SessionManager
from .validation import ValidationException, validate_and_parse_page_context, validate_project_metadata

logger = logging.getLogger(__name__)

# Model descriptors for LiveKit Inference
STT_MODEL = "assemblyai/universal-streaming:en"
LLM_MODEL = "openai/gpt-4o-mini"
TTS_MODEL = "cartesia/sonic-3"

# Global RAG service instance (initialized once per worker)
_rag_service: Optional[RAGService] = None


async def get_rag_service() -> RAGService:
    """
    Get or initialize the RAG service singleton.
    
    Returns:
        Initialized RAGService instance
    """
    global _rag_service
    if _rag_service is None:
        config = get_config()
        if not config.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required for RAG functionality")
        _rag_service = create_rag_service(
            database_url=config.database_url,
            openai_api_key=config.openai_api_key,
        )
        await _rag_service.initialize()
        logger.info("RAG service initialized")
    return _rag_service


@function_tool()
async def search_knowledge(
    context: RunContext[SessionContext],
    query: str,
) -> str:
    """Search the knowledge base for information relevant to the user's question.
    
    Use this tool when the user asks a question that might be answered by
    the project's uploaded documents. This searches through PDFs, text files,
    and markdown documents that have been uploaded to the project.
    
    Args:
        query: The search query based on what the user is asking about.
               Be specific and include key terms from the user's question.
    
    Returns:
        Relevant document excerpts that can help answer the user's question,
        or a message indicating no relevant documents were found.
    """
    session_context = context.userdata
    if not session_context:
        logger.warning("No session context available for RAG search")
        return "No relevant documents found."
    
    project_id = session_context.project_id
    
    try:
        rag_service = await get_rag_service()
        result = await rag_service.search_formatted(
            query=query,
            project_id=project_id,
            top_k=3,
        )
        
        logger.info(
            "RAG search completed",
            extra={
                "project_id": project_id,
                "query_length": len(query),
                "has_results": result != "No relevant documents found.",
            },
        )
        
        return result
        
    except Exception as e:
        logger.error(
            "RAG search failed",
            extra={
                "project_id": project_id,
                "error": str(e),
                "error_type": type(e).__name__,
            },
        )
        # Return graceful fallback instead of raising ToolError
        # This allows the agent to continue the conversation
        return "I couldn't search the knowledge base right now. Please try rephrasing your question."


async def entrypoint(ctx: JobContext) -> None:
    """
    Main entrypoint for LiveKit agent worker.
    
    This function is called when a participant joins a LiveKit room.
    It initializes the AgentSession with LiveKit Inference models and
    starts the voice pipeline (STT → LLM → TTS).
    
    Error Handling:
    - Connection errors: Logged and raised (framework will retry)
    - Invalid project_id: Logged and returns early (permanent error)
    - Session initialization errors: Logged and raised (permanent error)
    - Data channel errors: Logged but don't interrupt session (transient)
    
    Args:
        ctx: JobContext provided by LiveKit Agents framework
    """
    room_name = ctx.room.name
    logger.info("Agent worker starting", extra={"room": room_name})
    
    try:
        # Connect to the room
        await ctx.connect()
    except Exception as e:
        logger.error(
            "Failed to connect to room",
            extra={"room": room_name, "error": str(e), "error_type": type(e).__name__},
            exc_info=True,
        )
        raise  # Let framework handle retry
    
    try:
        # Wait for a participant to join
        participant = await ctx.wait_for_participant()
        logger.info(
            "Participant joined",
            extra={
                "room": room_name,
                "participant": participant.identity,
            },
        )
    except Exception as e:
        logger.error(
            "Failed waiting for participant",
            extra={"room": room_name, "error": str(e), "error_type": type(e).__name__},
            exc_info=True,
        )
        raise  # Let framework handle retry
    
    # Extract project_id and widget_token from room metadata
    # In console mode, use defaults for testing
    project_id, widget_token = await _extract_project_metadata(ctx)
    if not project_id:
        # Check if this is console mode (mock room)
        if room_name == "mock_room":
            logger.info(
                "Console mode detected - using default project_id for testing",
                extra={"room": room_name},
            )
            project_id = "00000000-0000-0000-0000-000000000000"  # Default for console mode
        else:
            logger.error(
                "No valid project_id in room metadata - cannot proceed",
                extra={"room": room_name},
            )
            return  # Permanent error - don't retry
    
    logger.info(
        "Extracted project metadata",
        extra={
            "room": room_name,
            "project_id": project_id,
            "has_widget_token": widget_token is not None,
        },
    )
    
    # Initialize session context for storing page context and other session data
    # This will be accessible in agent tools via RunContext
    session_context = SessionContext(
        project_id=project_id,
        page_context=None,  # Will be populated by data channel handler
        widget_token=widget_token,
    )
    
    # Create API conversation for logging (if widget_token is available)
    # Get config for API URL - gracefully handle if not available
    try:
        config = get_config()
        api_server_url = config.api_server_url
    except SystemExit:
        # Config validation failed - skip API logging
        api_server_url = None
        logger.warning("Config not available - API conversation logging disabled")
    
    if widget_token and api_server_url:
        try:
            session_manager = SessionManager(db_pool=None)  # We only use API logging, not DB
            api_conversation_id = await session_manager.create_api_conversation(
                project_id=project_id,
                session_id=room_name,
                widget_token=widget_token,
                api_url=config.api_server_url,
            )
            if api_conversation_id:
                session_context.api_conversation_id = api_conversation_id
                logger.info(
                    "API conversation created for logging",
                    extra={
                        "room": room_name,
                        "project_id": project_id,
                        "api_conversation_id": api_conversation_id,
                    },
                )
        except Exception as e:
            # Don't fail the session if API logging setup fails
            logger.warning(
                "Failed to create API conversation - logging disabled",
                extra={
                    "room": room_name,
                    "project_id": project_id,
                    "error": str(e),
                },
            )
    
    try:
        # Build context-aware instructions
        page_url = session_context.page_context.url if session_context.page_context else None
        instructions = _build_agent_instructions(page_url)
        
        # Create agent with RAG tool for knowledge grounding
        agent = Agent(
            instructions=instructions,
            tools=[search_knowledge],
        )
        
        # Initialize AgentSession with LiveKit Inference models
        # These model descriptors use LiveKit's unified gateway
        # Note: MultilingualModel() automatically retrieves job context internally
        session = AgentSession[SessionContext](
            stt=inference.STT.from_model_string(STT_MODEL),
            llm=inference.LLM.from_model_string(LLM_MODEL),
            tts=inference.TTS.from_model_string(TTS_MODEL),
            vad=silero.VAD.load(),
            turn_detection=MultilingualModel(),
            userdata=session_context,
        )
        
        logger.info(
            "AgentSession initialized",
            extra={
                "room": room_name,
                "project_id": project_id,
                "stt": STT_MODEL,
                "llm": LLM_MODEL,
                "tts": TTS_MODEL,
                "vad": "silero",
                "turn_detection": "multilingual",
            },
        )
    except Exception as e:
        logger.error(
            "Failed to initialize agent session",
            extra={
                "room": room_name,
                "project_id": project_id,
                "error": str(e),
                "error_type": type(e).__name__,
            },
            exc_info=True,
        )
        raise  # Permanent error - invalid configuration
    
    # Set up data channel handler for page context
    # Page context is stored in session_context.userdata and will be accessible
    # in agent tools via RunContext parameter (Task 5)
    @ctx.room.on("data_received")
    def on_data_received(data: rtc.DataPacket) -> None:
        """
        Handle data channel messages from widget.
        
        Errors in data channel processing are logged but don't interrupt
        the voice session (transient errors).
        """
        try:
            # Validate and parse page context (includes size check, JSON parsing, and Pydantic validation)
            page_context_input = validate_and_parse_page_context(data.data)
            
            # Store validated page context in session userdata
            # This will be accessible in agent tools via context.userdata.page_context
            session_context.page_context = PageContext(url=page_context_input.url)
            
            logger.info(
                "Page context received",
                extra={
                    "room": room_name,
                    "project_id": project_id,
                    "page_url": page_context_input.url,
                },
            )
        except ValidationException as e:
            logger.warning(
                "Invalid page context data",
                extra={
                    "room": room_name,
                    "project_id": project_id,
                    "error": str(e),
                },
            )
        except Exception as e:
            logger.warning(
                "Failed to process data channel message",
                extra={
                    "room": room_name,
                    "project_id": project_id,
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
            )
    
    # Set up conversation logging if API conversation was created
    pending_user_query: Optional[str] = None
    
    if session_context.api_conversation_id and session_context.widget_token:
        @session.on("conversation_item_added")
        async def on_conversation_item_added(event: ConversationItemAddedEvent) -> None:
            """
            Log conversation turns to API server.
            
            Captures user queries and agent responses, pairing them into turns.
            """
            nonlocal pending_user_query
            
            item = event.item
            text_content = item.text_content
            
            if not text_content:
                return
            
            if item.role == "user":
                # Store user query to pair with next agent response
                pending_user_query = text_content
                logger.debug(
                    "User query captured for logging",
                    extra={
                        "room": room_name,
                        "query_length": len(text_content),
                    },
                )
            elif item.role == "assistant" and pending_user_query:
                # We have a complete turn - log it
                try:
                    turn = Turn.create(
                        session_id=room_name,
                        user_query=pending_user_query,
                        agent_response=text_content,
                    )
                    
                    session_manager = SessionManager(db_pool=None)
                    await session_manager.log_turn_to_api(
                        conversation_id=session_context.api_conversation_id,
                        turn=turn,
                        widget_token=session_context.widget_token,
                        api_url=api_server_url,
                    )
                    
                    logger.debug(
                        "Turn logged to API",
                        extra={
                            "room": room_name,
                            "turn_id": turn.turn_id,
                            "api_conversation_id": session_context.api_conversation_id,
                        },
                    )
                except Exception as e:
                    logger.warning(
                        "Failed to log turn to API",
                        extra={
                            "room": room_name,
                            "error": str(e),
                        },
                    )
                finally:
                    pending_user_query = None
    
    try:
        # Start the session - framework handles everything from here!
        # Note: AgentSession.start() only takes room and agent parameters
        # The framework automatically handles participant connections
        await session.start(room=ctx.room, agent=agent)
        
        logger.info(
            "AgentSession started",
            extra={
                "room": room_name,
                "project_id": project_id,
                "api_logging_enabled": session_context.api_conversation_id is not None,
            },
        )
    except Exception as e:
        logger.error(
            "Failed to start agent session",
            extra={
                "room": room_name,
                "project_id": project_id,
                "error": str(e),
                "error_type": type(e).__name__,
            },
            exc_info=True,
        )
        raise  # Let framework handle cleanup


async def _extract_project_metadata(ctx: JobContext) -> tuple[Optional[str], Optional[str]]:
    """
    Extract and validate project_id and widget_token from room metadata.
    
    Args:
        ctx: JobContext with room information
        
    Returns:
        Tuple of (project_id, widget_token) or (None, None) if invalid/missing
    """
    try:
        # Get metadata from room
        metadata = ctx.room.metadata
        if not metadata:
            logger.warning("Room has no metadata", extra={"room": ctx.room.name})
            return None, None
        
        # Validate and parse using validation utility
        project_metadata = validate_project_metadata(metadata)
        
        # Extract widget_token if present (optional for conversation logging)
        widget_token = None
        if isinstance(metadata, dict):
            widget_token = metadata.get("widget_token")
        elif isinstance(metadata, str):
            import json
            try:
                parsed = json.loads(metadata)
                widget_token = parsed.get("widget_token")
            except (json.JSONDecodeError, AttributeError):
                pass
        
        return project_metadata.project_id, widget_token
        
    except ValidationException as e:
        logger.error(
            "Invalid project metadata",
            extra={"room": ctx.room.name, "error": str(e)},
        )
        return None, None
    except Exception as e:
        logger.error(
            "Failed to extract project metadata",
            extra={"room": ctx.room.name, "error": str(e)},
        )
        return None, None


# Keep legacy function for backwards compatibility with tests
async def _extract_project_id(ctx: JobContext) -> Optional[str]:
    """
    Extract and validate project_id from room metadata.
    
    Legacy function - use _extract_project_metadata for full metadata extraction.
    """
    project_id, _ = await _extract_project_metadata(ctx)
    return project_id


def _build_agent_instructions(page_url: Optional[str] = None) -> str:
    """
    Build agent instructions with optional page context.
    
    Args:
        page_url: Current page URL the user is viewing (optional)
        
    Returns:
        Agent instructions string
    """
    base_instructions = """You are a helpful voice assistant for website visitors.

Your primary role is to answer questions using the knowledge base. When a user asks a question:
1. Use the search_knowledge tool to find relevant information from the uploaded documents
2. Base your answer on the search results
3. If no relevant documents are found, be honest and say you don't have that information

Communication style:
- Be conversational, friendly, and concise
- Speak naturally as if having a real conversation
- Keep responses brief - aim for 1-2 sentences unless more detail is needed
- Don't mention "documents" or "knowledge base" - just answer naturally
- If you're unsure, say so honestly"""

    if page_url:
        base_instructions += f"""

Context: The user is currently viewing: {page_url}
Consider this when answering questions - they may be asking about content on this page."""

    return base_instructions
