"""Core capability for always-on tools.

This capability provides tools that are always available regardless of
project configuration, such as page context awareness and session control.

These tools are fundamental to the voice agent experience and should
always be registered.
"""

import logging
from typing import TYPE_CHECKING, Any, Callable

from livekit.agents import RunContext, function_tool

from .base import Capability, CapabilityContext, CapabilityResponse

if TYPE_CHECKING:
    from ..models import SessionContext

logger = logging.getLogger(__name__)

# Valid termination reasons (Requirements 2.2, 2.6)
VALID_TERMINATION_REASONS = frozenset({
    "conversation_complete",
    "user_inactive",
    "form_submitted",
    "user_requested",
    "error",
})


class CoreCapability(Capability):
    """Core capability providing always-on tools.
    
    This capability is always enabled and provides fundamental tools:
    - get_page_context: Get information about the current page
    
    Future tools:
    - get_session_info: Get session metadata
    - get_time: Get current time/date
    """
    
    @property
    def name(self) -> str:
        return "core"
    
    async def can_handle(self, context: CapabilityContext) -> float:
        """Core capability doesn't handle requests directly."""
        return 0.0
    
    async def handle(self, context: CapabilityContext) -> CapabilityResponse:
        """Core capability doesn't handle requests directly."""
        return CapabilityResponse.fallback()
    
    def is_enabled(self, session_context: "SessionContext") -> bool:
        """Core capability is always enabled."""
        return True
    
    def get_tools(self, session_context: "SessionContext") -> list[Callable[..., Any]]:
        """Return core tools.
        
        Provides:
        - get_page_context: Page awareness tool
        - end_session: Session termination tool (Requirements 2.1, 2.2, 2.5, 2.6)
        
        Args:
            session_context: The session context
            
        Returns:
            List of core tools
        """
        # Import here to avoid circular imports
        from ..utils import send_widget_message
        
        @function_tool()
        async def get_page_context(
            context: RunContext[Any],
        ) -> str:
            """Get information about the page the user is currently viewing.

            Use this tool when the user asks about:
            - What page they're on
            - The current URL or page title
            - Context about where they are on the website

            Returns:
                Information about the current page URL, or a message if not available.
            """
            ctx = context.userdata
            if not ctx or not ctx.page_context:
                return "I don't have information about which page you're viewing right now."
            
            page_url = ctx.page_context.url
            return f"You are currently viewing: {page_url}"
        
        @function_tool()
        async def end_session(
            context: RunContext[Any],
            reason: str,
            message: str = "",
        ) -> str:
            """End the current voice session.
            
            Use this tool when:
            - The conversation has naturally concluded
            - The user has been inactive for too long
            - A form has been successfully submitted
            - The user explicitly asks to end the session
            - An unrecoverable error occurs
            
            Args:
                reason: One of "conversation_complete", "user_inactive", 
                        "form_submitted", "user_requested", "error"
                message: Optional closing message to display to the user
                
            Returns:
                Confirmation that the session end was initiated.
            """
            ctx = context.userdata
            
            # Validate reason against allowed values (Requirement 2.2, 2.6)
            validated_reason = reason if reason in VALID_TERMINATION_REASONS else "error"
            if validated_reason != reason:
                logger.warning(
                    "Invalid termination reason provided, using fallback",
                    extra={
                        "provided_reason": reason,
                        "fallback_reason": validated_reason,
                    },
                )
            
            # Log termination event for analytics (Requirement 2.5)
            logger.info(
                "Session termination initiated by agent",
                extra={
                    "reason": validated_reason,
                    "original_reason": reason,
                    "has_message": bool(message),
                    "project_id": ctx.project_id if ctx else None,
                },
            )
            
            # Send session_end message to widget via data channel (Requirement 2.3)
            if ctx and ctx.room:
                session_end_message = {
                    "type": "session_end",
                    "reason": validated_reason,
                }
                if message:
                    session_end_message["message"] = message
                
                try:
                    import asyncio
                    await send_widget_message(ctx.room, session_end_message)
                    logger.debug(
                        "Session end message sent to widget",
                        extra={"reason": validated_reason},
                    )
                except Exception as e:
                    logger.warning(
                        "Failed to send session end message to widget",
                        extra={"error": str(e)},
                    )
            
            return f"Session end initiated with reason: {validated_reason}"
        
        return [get_page_context, end_session]
    
    def get_instruction_fragment(self, session_context: "SessionContext") -> str:
        """Return core instructions.
        
        Provides basic context awareness and session control guidance.
        
        Args:
            session_context: The session context
            
        Returns:
            Core instruction fragment
        """
        return """### Page Context
You can check what page the user is viewing using the get_page_context tool.
Use this when users ask about their current page or need context-aware help.

### Session Control
You can end the session using the end_session tool when appropriate:
- Use reason "conversation_complete" when the conversation has naturally concluded
- Use reason "user_inactive" if the user hasn't responded for an extended period
- Use reason "form_submitted" after a form has been successfully submitted
- Use reason "user_requested" when the user explicitly asks to end the session
- Use reason "error" for unrecoverable errors
You may include an optional closing message to display to the user."""
