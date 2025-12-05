"""Base capability interface for voice agent orchestration.

Capabilities are pluggable modules that handle specific types of user requests.
Each capability implements can_handle() to indicate confidence and handle() to process.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


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
    
    MVP Capabilities:
    - RAGCapability: Answers questions from uploaded documents
    - FormCapability: Guides users through conversational forms (future)
    
    Future Capabilities:
    - BookingCapability: Calendar scheduling
    - ProductCapability: E-commerce recommendations
    - HandoffCapability: Escalate to human
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for this capability."""
        pass
    
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
