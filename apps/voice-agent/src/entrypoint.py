"""Main entrypoint for LiveKit agent worker."""

import logging
from dataclasses import dataclass
from typing import Dict, Optional

from livekit import rtc
from livekit.agents import (
    Agent,
    AgentSession,
    ConversationItemAddedEvent,
    JobContext,
    inference,
)
from livekit.plugins import silero

from .capabilities import (
    CapabilityRegistry,
    CoreCapability,
    FormCapabilityV2,
    FormContext,
    FormStateEnum,
    FORM_STATE_KEY,
    InstructionBuilder,
    RAGCapability,
)
from .config import get_config
from .models import AgentConfig, PageContext, SessionContext, Turn
from .rag_service import RAGService, create_rag_service
from .session_manager import SessionManager
from .utils import sanitize_url_for_logging, send_widget_message
from .validation import ValidationException, validate_and_parse_page_context

logger = logging.getLogger(__name__)


async def _fetch_active_form(project_id: str, room_name: str, config) -> Optional[Dict]:
    """Fetch active form for the given project from the API.

    Args:
        project_id: The project ID to fetch the form for
        room_name: Name of the room for logging
        config: Application config with API server URL

    Returns:
        Dictionary containing form data if found, None otherwise
    """
    if not config.api_server_url:
        logger.warning(
            "API server URL not configured - cannot fetch forms",
            extra={"room": room_name},
        )
        return None

    try:
        logger.info(
            "Fetching active form from API",
            extra={
                "room": room_name,
                "project_id": project_id,
                "api_url": f"{config.api_server_url}/api/internal/projects/{project_id}/active-form",
            },
        )

        form_capability = FormCapabilityV2(api_base_url=config.api_server_url)
        active_form = await form_capability._fetch_active_form(project_id)

        if active_form:
            logger.info(
                "Active form loaded for project",
                extra={
                    "room": room_name,
                    "project_id": project_id,
                    "form_id": active_form.get("id"),
                    "form_name": active_form.get("name"),
                    "field_count": len(active_form.get("fields", [])),
                },
            )
        else:
            logger.info(
                "No active form found for project - using FAQ mode",
                extra={
                    "room": room_name,
                    "project_id": project_id,
                },
            )

        return active_form

    except Exception as e:
        logger.warning(
            "Failed to fetch active form - continuing without form mode",
            extra={
                "room": room_name,
                "project_id": project_id,
                "error": str(e),
                "error_type": type(e).__name__,
            },
        )
        return None


# Model descriptors for LiveKit Inference
STT_MODEL = "assemblyai/universal-streaming:en"
LLM_MODEL = "google/gemini-2.5-flash"
TTS_MODEL = "cartesia/sonic-3:f31cc6a7-c1e8-4764-980c-60a361443dd1"

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
            openai_base_url=config.openai_base_url,
        )
        await _rag_service.initialize()
        logger.info("RAG service initialized")
    return _rag_service


# send_widget_message is imported from .utils





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

    # Extract project_id, widget_token, and agent config from room metadata
    # In console mode, use defaults for testing
    metadata_result = await _extract_project_metadata(ctx)
    project_id = metadata_result.project_id
    widget_token = metadata_result.widget_token
    agent_config = metadata_result.agent_config

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
            "has_agent_config": agent_config is not None,
        },
    )

    # Initialize session context for storing page context and other session data
    # This will be accessible in agent tools via RunContext
    session_context = SessionContext(
        project_id=project_id,
        page_context=None,  # Will be populated by data channel handler
        widget_token=widget_token,
        agent_config=agent_config,
        room=ctx.room,
        active_form=None,  # Will be set after fetching from API
    )

    # Fetch active form for this project (if any)
    config = get_config()
    active_form = await _fetch_active_form(project_id, room_name, config)
    if active_form:
        session_context.active_form = active_form

    # Create API conversation for logging (if widget_token is available)
    # Get config for API URL - gracefully handle if not available
    try:
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
        # Initialize capability registry and register all capabilities
        # Requirements 1.1, 1.3: Dynamic capability registration
        registry = CapabilityRegistry()
        
        # Register core capability (always-on tools like get_page_context)
        registry.register(CoreCapability())
        
        # Register RAG capability if RAG service is available
        try:
            rag_service = await get_rag_service()
            registry.register(RAGCapability(rag_service=rag_service))
        except Exception as e:
            logger.warning(
                "RAG service not available - RAG capability disabled",
                extra={"room": room_name, "error": str(e)},
            )
        
        # Register form capability if API server is configured
        if config.api_server_url:
            registry.register(FormCapabilityV2(api_base_url=config.api_server_url))
        
        # Store registry in session context for access by capabilities
        # Requirements 1.3: Make registry available to capabilities
        session_context.capability_registry = registry
        
        logger.info(
            "Capability registry initialized",
            extra={
                "room": room_name,
                "project_id": project_id,
                "registered_capabilities": registry.capability_names,
            },
        )
        
        # Build instructions using InstructionBuilder
        # Requirements 2.1: Composable instruction building
        instruction_builder = InstructionBuilder(registry)
        instructions = instruction_builder.build(
            session_context=session_context,
            agent_config=agent_config,
        )
        
        # Collect tools from all enabled capabilities
        # Requirements 3.1, 6.2: Dynamic tool assembly with logging
        tools = registry.collect_tools(session_context)
        tool_names = [getattr(t, "__name__", str(t)) for t in tools]
        
        # Create agent with dynamically collected tools
        agent = Agent(
            instructions=instructions,
            tools=tools,
        )

        logger.info(
            "Agent created with capability-driven architecture",
            extra={
                "room": room_name,
                "project_id": project_id,
                "instructions_length": len(instructions),
                "tools": tool_names,
                "enabled_capabilities": [c.name for c in registry.get_enabled_capabilities(session_context)],
            },
        )

        # Initialize AgentSession with LiveKit Inference models
        # These model descriptors use LiveKit's unified gateway
        session = AgentSession[SessionContext](
            stt=inference.STT.from_model_string(STT_MODEL),
            llm=inference.LLM.from_model_string(LLM_MODEL),
            tts=inference.TTS.from_model_string(TTS_MODEL),
            vad=silero.VAD.load(),
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
                "has_form": active_form is not None,
                "form_id": active_form.get("id") if active_form else None,
                "form_name": active_form.get("name") if active_form else None,
                "has_page_context": session_context.page_context is not None,
                "has_agent_config": agent_config is not None,
                "instructions_length": len(instructions),
                "tools": tool_names,
                "enabled_capabilities": registry.capability_names,
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

    # Set up data channel handler for page context and form messages
    # Page context is stored in session_context.userdata and will be accessible
    # in agent tools via RunContext parameter (Task 5)
    # Form messages are handled for widget-agent sync (Requirements 10.1-10.3)
    @ctx.room.on("data_received")
    def on_data_received(data: rtc.DataPacket) -> None:
        """
        Handle data channel messages from widget.

        Message types (Requirements 10.1-10.3):
        - page_context: Page URL and title
        - keyboard_input: User typed a value in the form
        - field_confirmed: User confirmed a voice-extracted value
        - field_rejected: User rejected a voice-extracted value
        - form_abandoned: User abandoned the form
        - submission_approved: User approved submission from summary
        - edit_requested: User wants to edit a field from summary

        Errors in data channel processing are logged but don't interrupt
        the voice session (transient errors).
        """
        try:
            import json

            # Parse JSON message
            try:
                message = json.loads(data.data.decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                # Try legacy page context format
                page_context_input = validate_and_parse_page_context(data.data)
                session_context.page_context = PageContext(url=page_context_input.url)
                logger.info(
                    "Page context received (legacy)",
                    extra={
                        "room": room_name,
                        "project_id": project_id,
                        "page_url": sanitize_url_for_logging(page_context_input.url),
                    },
                )
                return

            msg_type = message.get("type")

            if msg_type == "page_context":
                # Handle page context message
                session_context.page_context = PageContext(url=message.get("url", ""))
                logger.info(
                    "Page context received",
                    extra={
                        "room": room_name,
                        "project_id": project_id,
                        "page_url": sanitize_url_for_logging(message.get("url", "")),
                    },
                )

            elif msg_type == "keyboard_input":
                # Handle keyboard input from widget (Requirement 10.3)
                # Store in session context for form capability to process
                field_name = message.get("fieldName")
                value = message.get("value")
                if field_name and value is not None:
                    if not hasattr(session_context, "pending_keyboard_input"):
                        session_context.pending_keyboard_input = {}
                    session_context.pending_keyboard_input[field_name] = value
                    logger.debug(
                        "Keyboard input received",
                        extra={"room": room_name, "field": field_name, "value": value},
                    )

            elif msg_type == "field_confirmed":
                # Handle field confirmation from widget
                field_name = message.get("fieldName")
                if field_name:
                    if not hasattr(session_context, "confirmed_fields"):
                        session_context.confirmed_fields = set()
                    session_context.confirmed_fields.add(field_name)
                    logger.debug(
                        "Field confirmed via widget",
                        extra={"room": room_name, "field": field_name},
                    )

            elif msg_type == "field_rejected":
                # Handle field rejection from widget
                field_name = message.get("fieldName")
                if field_name:
                    if not hasattr(session_context, "rejected_fields"):
                        session_context.rejected_fields = set()
                    session_context.rejected_fields.add(field_name)
                    logger.debug(
                        "Field rejected via widget",
                        extra={"room": room_name, "field": field_name},
                    )

            elif msg_type == "form_abandoned":
                # Handle form abandonment from widget
                session_context.form_abandoned = True
                logger.info(
                    "Form abandoned via widget",
                    extra={"room": room_name, "project_id": project_id},
                )

            elif msg_type == "submission_approved":
                # Handle submission approval from widget
                session_context.submission_approved = True
                logger.info(
                    "Submission approved via widget",
                    extra={"room": room_name, "project_id": project_id},
                )

            elif msg_type == "edit_requested":
                # Handle edit request from widget
                field_name = message.get("fieldName")
                if field_name:
                    session_context.edit_requested_field = field_name
                    logger.debug(
                        "Edit requested via widget",
                        extra={"room": room_name, "field": field_name},
                    )

            else:
                logger.debug(
                    "Unknown message type",
                    extra={"room": room_name, "type": msg_type},
                )

        except ValidationException as e:
            logger.warning(
                "Invalid data channel message",
                extra={"room": room_name, "project_id": project_id, "error": str(e)},
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

    import asyncio

    # Set up agent message sending to widget (Requirement 3.3)
    # This sends agent responses as chat messages to the widget for display
    async def _send_agent_message_async(content: str, is_speaking: bool = False) -> None:
        """Send agent message to widget via data channel."""
        try:
            await send_widget_message(
                ctx.room,
                {
                    "type": "agent_message",
                    "content": content,
                    "isSpeaking": is_speaking,
                },
            )
            logger.debug(
                "Agent message sent to widget",
                extra={
                    "room": room_name,
                    "content_length": len(content),
                    "is_speaking": is_speaking,
                },
            )
        except Exception as e:
            logger.warning(
                "Failed to send agent message to widget",
                extra={
                    "room": room_name,
                    "error": str(e),
                },
            )

    async def _send_speaking_state_async(is_speaking: bool) -> None:
        """Send speaking state indicator to widget."""
        try:
            msg_type = "agent_speaking_start" if is_speaking else "agent_speaking_end"
            await send_widget_message(ctx.room, {"type": msg_type})
            logger.debug(
                "Speaking state sent to widget",
                extra={
                    "room": room_name,
                    "is_speaking": is_speaking,
                },
            )
        except Exception as e:
            logger.warning(
                "Failed to send speaking state to widget",
                extra={
                    "room": room_name,
                    "error": str(e),
                },
            )

    # Track speaking state for agent messages
    agent_is_speaking = False

    @session.on("conversation_item_added")
    def on_conversation_item_added_for_widget(event: ConversationItemAddedEvent) -> None:
        """
        Send agent messages to widget for chat display.

        Requirement 3.3: Display agent's text as agent message bubble
        """
        nonlocal agent_is_speaking

        item = event.item
        text_content = item.text_content

        if not text_content:
            return

        if item.role == "assistant":
            # Send agent message to widget for display in chat panel
            # Mark as speaking since TTS will follow
            agent_is_speaking = True
            asyncio.create_task(_send_agent_message_async(text_content, is_speaking=True))
            asyncio.create_task(_send_speaking_state_async(True))

    # API conversation logging (if enabled)
    if session_context.api_conversation_id and session_context.widget_token:

        async def _log_turn_async(user_query: str, agent_response: str) -> None:
            """Async helper to log turn to API."""
            try:
                turn = Turn.create(
                    session_id=room_name,
                    user_query=user_query,
                    agent_response=agent_response,
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

        @session.on("conversation_item_added")
        def on_conversation_item_added_for_logging(event: ConversationItemAddedEvent) -> None:
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
                # We have a complete turn - log it async
                asyncio.create_task(_log_turn_async(pending_user_query, text_content))
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
                "has_active_form": active_form is not None,
            },
        )

        # NOTE: Do NOT send form_activate here automatically!
        # Requirements 1.1, 1.3, 2.1 specify that:
        # - The agent SHALL greet the user first
        # - The agent SHALL wait for user response to understand intent
        # - The agent SHALL explain the form's purpose before activating
        #
        # Form activation should happen via the FormCapabilityV2 when:
        # 1. User expresses intent matching a form's trigger phrases
        # 2. Agent determines a form is appropriate for the conversation
        #
        # The active_form is stored in session_context and available to
        # the agent's instructions for context-aware responses.
        if active_form:
            logger.info(
                "Active form available for agent (not auto-activated)",
                extra={
                    "room": room_name,
                    "form_id": active_form.get("id"),
                    "form_name": active_form.get("name"),
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


@dataclass
class ProjectMetadataResult:
    """Result of extracting project metadata from room."""

    project_id: Optional[str] = None
    widget_token: Optional[str] = None
    agent_config: Optional[AgentConfig] = None


async def _extract_project_metadata(ctx: JobContext) -> ProjectMetadataResult:
    """
    Extract and validate project_id, widget_token, and agent config from metadata.

    The metadata is set on the participant token by the API server when generating
    LiveKit credentials. We can access it via ctx.job.metadata or from the participant.

    Args:
        ctx: JobContext with room and job information

    Returns:
        ProjectMetadataResult with extracted values (None if invalid/missing)
    """
    import json

    result = ProjectMetadataResult()

    try:
        # First try job metadata (set via room creation)
        metadata = None

        # Try to get metadata from the job (if available)
        if hasattr(ctx, "job") and ctx.job and hasattr(ctx.job, "metadata") and ctx.job.metadata:
            metadata = ctx.job.metadata
            logger.debug("Got metadata from job", extra={"room": ctx.room.name})

        # Fall back to room metadata
        if not metadata and ctx.room.metadata:
            metadata = ctx.room.metadata
            logger.debug("Got metadata from room", extra={"room": ctx.room.name})

        # Try to get from first remote participant's metadata
        if not metadata:
            for participant in ctx.room.remote_participants.values():
                if participant.metadata:
                    metadata = participant.metadata
                    logger.debug(
                        "Got metadata from participant",
                        extra={"room": ctx.room.name, "participant": participant.identity},
                    )
                    break

        if not metadata:
            logger.warning(
                "No metadata found in job, room, or participants", extra={"room": ctx.room.name}
            )
            return result

        # Parse metadata if it's a string
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except json.JSONDecodeError:
                logger.error("Failed to parse metadata JSON", extra={"room": ctx.room.name})
                return result

        # Extract project_id and widget_token
        project_id = metadata.get("project_id")
        widget_token = metadata.get("widget_token")

        if not project_id:
            logger.warning("No project_id in metadata", extra={"room": ctx.room.name})
            return result

        # Validate project_id format (CUID - starts with 'c' and is alphanumeric)
        if not isinstance(project_id, str) or len(project_id) < 20:
            logger.error(
                "Invalid project_id format", extra={"room": ctx.room.name, "project_id": project_id}
            )
            return result

        result.project_id = project_id
        result.widget_token = widget_token

        # Extract agent config (optional)
        system_prompt = metadata.get("system_prompt")
        agent_name = metadata.get("agent_name")

        if system_prompt or agent_name:
            result.agent_config = AgentConfig(
                system_prompt=system_prompt,
                agent_name=agent_name,
            )
            logger.info(
                "Agent config loaded",
                extra={
                    "room": ctx.room.name,
                    "has_system_prompt": system_prompt is not None,
                    "agent_name": agent_name,
                },
            )

        return result

    except Exception as e:
        logger.error(
            "Failed to extract project metadata",
            extra={"room": ctx.room.name, "error": str(e)},
        )
        return result


# Keep legacy function for backwards compatibility with tests
async def _extract_project_id(ctx: JobContext) -> Optional[str]:
    """
    Extract and validate project_id from room metadata.

    Legacy function - use _extract_project_metadata for full metadata extraction.
    """
    result = await _extract_project_metadata(ctx)
    return result.project_id









