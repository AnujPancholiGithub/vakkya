"""Main entrypoint for LiveKit agent worker."""

import json
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

from .models import PageContext, PageContextInput, ProjectMetadata

logger = logging.getLogger(__name__)


async def entrypoint(ctx: JobContext) -> None:
    """
    Main entrypoint for LiveKit agent worker.
    
    This function is called when a participant joins a LiveKit room.
    It initializes the AgentSession with LiveKit Inference models and
    starts the voice pipeline (STT → LLM → TTS).
    
    Args:
        ctx: JobContext provided by LiveKit Agents framework
    """
    logger.info("Agent worker starting", extra={"room": ctx.room.name})
    
    # Connect to the room
    await ctx.connect()
    logger.info("Connected to room", extra={"room": ctx.room.name})
    
    # Wait for a participant to join
    participant = await ctx.wait_for_participant()
    logger.info(
        "Participant joined",
        extra={
            "room": ctx.room.name,
            "participant": participant.identity,
        },
    )
    
    # Extract project_id from room metadata
    project_id = await _extract_project_id(ctx)
    if not project_id:
        logger.error("No project_id in room metadata", extra={"room": ctx.room.name})
        return
    
    logger.info(
        "Extracted project metadata",
        extra={"room": ctx.room.name, "project_id": project_id},
    )
    
    # Create agent with simple instructions (no RAG tool yet)
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
    session = AgentSession(
        stt=inference.STT.from_model_string("assemblyai/universal-streaming:en"),
        llm=inference.LLM.from_model_string("openai/gpt-4o-mini"),
        tts=inference.TTS.from_model_string("cartesia/sonic-3"),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )
    
    logger.info(
        "AgentSession initialized",
        extra={
            "room": ctx.room.name,
            "project_id": project_id,
            "stt": "assemblyai/universal-streaming:en",
            "llm": "openai/gpt-4o-mini",
            "tts": "cartesia/sonic-3",
            "vad": "silero",
            "turn_detection": "multilingual",
        },
    )
    
    # Set up data channel handler for page context
    # Store page context in a dict that can be accessed by the agent
    page_context_store = {"page_context": None}
    
    @ctx.room.on("data_received")
    def on_data_received(data: rtc.DataPacket) -> None:
        """Handle data channel messages from widget."""
        try:
            # Parse JSON payload
            payload = json.loads(data.data.decode("utf-8"))
            
            # Validate using Pydantic
            page_context_input = PageContextInput(**payload)
            
            # Store validated page context
            page_context_store["page_context"] = PageContext(url=page_context_input.url)
            
            logger.info(
                "Page context received",
                extra={
                    "room": ctx.room.name,
                    "page_url": page_context_input.url,
                },
            )
        except json.JSONDecodeError as e:
            logger.warning(
                "Invalid JSON in data channel message",
                extra={"room": ctx.room.name, "error": str(e)},
            )
        except Exception as e:
            logger.warning(
                "Failed to process data channel message",
                extra={"room": ctx.room.name, "error": str(e)},
            )
    
    # Start the session - framework handles everything from here!
    await session.start(room=ctx.room, agent=agent, participant=participant)
    
    logger.info("AgentSession started", extra={"room": ctx.room.name})


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
        
        # Parse and validate using Pydantic
        import json
        metadata_dict = json.loads(metadata) if isinstance(metadata, str) else metadata
        project_metadata = ProjectMetadata(**metadata_dict)
        
        return project_metadata.project_id
        
    except Exception as e:
        logger.error(
            "Failed to extract project_id from metadata",
            extra={"room": ctx.room.name, "error": str(e)},
        )
        return None
