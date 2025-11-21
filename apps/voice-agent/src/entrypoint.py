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

from .models import PageContext, ProjectMetadata

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
    session = AgentSession(
        stt=inference.STT.from_model_string("deepgram/nova-2-general"),
        llm=inference.LLM.from_model_string("openai/gpt-4o-mini"),
        tts=inference.TTS.from_model_string("openai/tts-1"),
        vad=silero.VAD.load(),
    )
    
    logger.info(
        "AgentSession initialized",
        extra={
            "room": ctx.room.name,
            "project_id": project_id,
            "stt": "deepgram/nova-2-general",
            "llm": "openai/gpt-4o-mini",
            "tts": "openai/tts-1",
            "vad": "silero",
        },
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
