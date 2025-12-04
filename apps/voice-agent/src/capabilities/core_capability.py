"""Core capability for always-on tools.

This capability provides tools that are always available regardless of
project configuration, such as page context awareness.

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
        
        Provides the get_page_context tool for page awareness.
        
        Args:
            session_context: The session context
            
        Returns:
            List of core tools
        """
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
        
        return [get_page_context]
    
    def get_instruction_fragment(self, session_context: "SessionContext") -> str:
        """Return core instructions.
        
        Provides basic context awareness guidance.
        
        Args:
            session_context: The session context
            
        Returns:
            Core instruction fragment
        """
        return """### Page Context
You can check what page the user is viewing using the get_page_context tool.
Use this when users ask about their current page or need context-aware help."""
