"""Base capability interface for voice agent orchestration.

Capabilities are pluggable modules that handle specific types of user requests.
Each capability implements can_handle() to indicate confidence and handle() to process.

Enhanced with dynamic tool and instruction support for the capability-driven architecture.
Capabilities can now:
- Register function tools dynamically via get_tools()
- Provide instruction fragments via get_instruction_fragment()
- Control their enabled state via is_enabled()
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Callable, Optional

if TYPE_CHECKING:
    from ..models import SessionContext


@dataclass
class CapabilityContext:
    """Context passed to capabilities for handling requests.
    
    Attributes:
        user_query: The transcribed user speech
        project_id: The project ID for scoping data access
        page_url: Optional URL of the page user is viewing
        session_id: Unique session identifier
        metadata: Additional context data
    """
    user_query: str
    project_id: str
    page_url: Optional[str] = None
    session_id: Optional[str] = None
    metadata: dict = field(default_factory=dict)


@dataclass
class CapabilityResponse:
    """Response from a capability after handling a request.
    
    Attributes:
        text: The response text to speak to the user
        confidence: How confident the capability was in handling (0-1)
        handled: Whether the capability successfully handled the request
        metadata: Additional response data (e.g., sources, form state)
    """
    text: str
    confidence: float = 1.0
    handled: bool = True
    metadata: dict = field(default_factory=dict)
    
    @classmethod
    def fallback(cls, message: str = "I'm not sure how to help with that.") -> "CapabilityResponse":
        """Create a fallback response for unhandled requests."""
        return cls(text=message, confidence=0.0, handled=False)


class Capability(ABC):
    """Abstract base class for voice agent capabilities.
    
    Capabilities are pluggable modules that handle specific types of requests.
    The orchestrator routes requests to the capability with highest confidence.
    
    Enhanced Interface (v2):
    - get_tools(): Return function tools this capability provides
    - get_instruction_fragment(): Return instructions to append to agent
    - is_enabled(): Check if capability should be active for session
    
    MVP Capabilities:
    - RAGCapability: Answers questions from uploaded documents
    - FormCapability: Guides users through conversational forms
    
    Future Capabilities:
    - BookingCapability: Calendar scheduling
    - ProductCapability: E-commerce recommendations
    - HandoffCapability: Escalate to human
    - MCPCapability: Model Context Protocol integrations
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for this capability."""
        pass
    
    # =========================================================================
    # Legacy Interface (for orchestrator-based routing)
    # =========================================================================
    
    @abstractmethod
    async def can_handle(self, context: CapabilityContext) -> float:
        """Determine confidence level for handling this request.
        
        Args:
            context: The request context with user query and metadata
            
        Returns:
            Confidence score from 0.0 (cannot handle) to 1.0 (definitely can handle)
        """
        pass
    
    @abstractmethod
    async def handle(self, context: CapabilityContext) -> CapabilityResponse:
        """Process the request and generate a response.
        
        Args:
            context: The request context with user query and metadata
            
        Returns:
            CapabilityResponse with text to speak and metadata
        """
        pass
    
    # =========================================================================
    # Enhanced Interface (for capability-driven agent architecture)
    # =========================================================================
    
    def is_enabled(self, session_context: "SessionContext") -> bool:
        """Check if this capability should be enabled for the session.
        
        Override to implement custom enable logic based on session context.
        For example, FormCapability checks if active_form exists.
        
        Args:
            session_context: The session context with project config and state
            
        Returns:
            True if capability should be active, False otherwise
        """
        return True
    
    def get_tools(self, session_context: "SessionContext") -> list[Callable[..., Any]]:
        """Return list of function tools this capability provides.
        
        Override to provide capability-specific tools that will be registered
        with the agent. Tools should be decorated with @function_tool().
        
        Args:
            session_context: The session context for tool configuration
            
        Returns:
            List of function tools (callables decorated with @function_tool)
        """
        return []
    
    def get_instruction_fragment(self, session_context: "SessionContext") -> str:
        """Return instruction fragment to append to agent instructions.
        
        Override to provide capability-specific instructions that will be
        appended to the agent's system prompt. This allows capabilities to
        add their own guidance without replacing the base or custom prompts.
        
        Args:
            session_context: The session context for instruction customization
            
        Returns:
            Instruction string to append (empty string if none)
        """
        return ""
