"""Main entrypoint for LiveKit agent worker."""

import logging
from typing import Optional

from livekit import rtc
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    WorkerOptions,
    cli,
    inference,
)
from livekit.plugins import silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from .models import PageContext, SessionContext
from .validation import ValidationException, validate_and_parse_page_context, validate_project_metadata

logger = logging.getLogger(__name__)

# Model descriptors for LiveKit Inference
STT_MODEL = "assemblyai/universal-streaming:en"
LLM_MODEL = "openai/gpt-4o-mini"
TTS_MODEL = "cartesia/sonic-3"


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
    
    # Extract project_id from room metadata
    project_id = await _extract_project_id(ctx)
    if not project_id:
        logger.error(
            "No valid project_id in room metadata - cannot proceed",
            extra={"room": room_name},
        )
        return  # Permanent error - don't retry
    
    logger.info(
        "Extracted project metadata",
        extra={"room": room_name, "project_id": project_id},
    )
    
    # Initialize session context for storing page context and other session data
    # This will be accessible in agent tools via RunContext (Task 5)
    session_context = SessionContext(
        project_id=project_id,
        page_context=None,  # Will be populated by data channel handler
    )
    
    try:
        # Create agent with simple instructions (no RAG tool yet - Task 5)
        agent = Agent(
            instructions="""You are a helpful voice assistant for website visitors.
            
            Be conversational, friendly, and concise in your responses.
            Speak naturally as if having a real conversation.
            Keep responses brief - aim for 1-2 sentences unless more detail is requested.
            
            If you don't know something, be honest and say so.
            """
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
    
    try:
        # Start the session - framework handles everything from here!
        await session.start(room=ctx.room, agent=agent, participant=participant)
        
        logger.info(
            "AgentSession started",
            extra={"room": room_name, "project_id": project_id},
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


async def _extract_project_id(ctx: JobContext) -> Optional[str]:
    """
    Extract and validate project_id from room metadata.
    
    Args:
        ctx: JobContext with room information
        
    Returns:
        Validated project_id or None if invalid/missing
    """
    try:
        # Get metadata from room
        metadata = ctx.room.metadata
        if not metadata:
            logger.warning("Room has no metadata", extra={"room": ctx.room.name})
            return None
        
        # Validate and parse using validation utility
        project_metadata = validate_project_metadata(metadata)
        
        return project_metadata.project_id
        
    except ValidationException as e:
        logger.error(
            "Invalid project metadata",
            extra={"room": ctx.room.name, "error": str(e)},
        )
        return None
    except Exception as e:
        logger.error(
            "Failed to extract project_id from metadata",
            extra={"room": ctx.room.name, "error": str(e)},
        )
        return None
