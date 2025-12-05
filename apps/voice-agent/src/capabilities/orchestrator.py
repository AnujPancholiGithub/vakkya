"""Capability orchestrator for routing requests to appropriate handlers.

The orchestrator evaluates all registered capabilities and routes each request
to the capability with the highest confidence score.
"""

import logging
from typing import Optional

from .base import Capability, CapabilityContext, CapabilityResponse

logger = logging.getLogger(__name__)

# Minimum confidence threshold for a capability to handle a request
MIN_CONFIDENCE_THRESHOLD = 0.1


class CapabilityOrchestrator:
    """Routes user requests to the most appropriate capability.
    
    The orchestrator:
    1. Evaluates all registered capabilities via can_handle()
    2. Selects the capability with highest confidence above threshold
    3. Delegates handling to the selected capability
    4. Returns fallback response if no capability can handle
    
    Example:
        orchestrator = CapabilityOrchestrator()
        orchestrator.register(RAGCapability(rag_service))
        orchestrator.register(FormCapability(form_service))
        
        response = await orchestrator.route(context)
    """
    
    def __init__(self, fallback_message: Optional[str] = None):
        """Initialize the orchestrator.
        
        Args:
            fallback_message: Custom message when no capability can handle
        """
        self._capabilities: list[Capability] = []
        self._fallback_message = fallback_message or (
            "I'm not sure how to help with that. "
            "Try asking about information from the uploaded documents."
        )
    
    def register(self, capability: Capability) -> None:
        """Register a capability with the orchestrator.
        
        Args:
            capability: The capability instance to register
        """
        self._capabilities.append(capability)
        logger.info(
            "Registered capability",
            extra={"capability": capability.name},
        )
    
    @property
    def capabilities(self) -> list[Capability]:
        """Get list of registered capabilities."""
        return list(self._capabilities)
    
    async def route(self, context: CapabilityContext) -> CapabilityResponse:
        """Route a request to the most appropriate capability.
        
        Evaluates all capabilities and selects the one with highest confidence.
        Returns fallback response if no capability exceeds the threshold.
        
        Args:
            context: The request context with user query and metadata
            
        Returns:
            CapabilityResponse from the selected capability or fallback
        """
        if not self._capabilities:
            logger.warning("No capabilities registered")
            return CapabilityResponse.fallback(self._fallback_message)
        
        # Evaluate all capabilities
        scores: list[tuple[Capability, float]] = []
        for capability in self._capabilities:
            try:
                confidence = await capability.can_handle(context)
                scores.append((capability, confidence))
                logger.debug(
                    "Capability confidence",
                    extra={
                        "capability": capability.name,
                        "confidence": confidence,
                        "query_length": len(context.user_query),
                    },
                )
            except Exception as e:
                logger.error(
                    "Capability evaluation failed",
                    extra={
                        "capability": capability.name,
                        "error": str(e),
                    },
                )
                # Continue with other capabilities
        
        if not scores:
            return CapabilityResponse.fallback(self._fallback_message)
        
        # Select highest confidence capability
        best_capability, best_confidence = max(scores, key=lambda x: x[1])
        
        if best_confidence < MIN_CONFIDENCE_THRESHOLD:
            logger.info(
                "No capability met confidence threshold",
                extra={
                    "best_capability": best_capability.name,
                    "best_confidence": best_confidence,
                    "threshold": MIN_CONFIDENCE_THRESHOLD,
                },
            )
            return CapabilityResponse.fallback(self._fallback_message)
        
        # Handle with selected capability
        logger.info(
            "Routing to capability",
            extra={
                "capability": best_capability.name,
                "confidence": best_confidence,
                "project_id": context.project_id,
            },
        )
        
        try:
            response = await best_capability.handle(context)
            response.metadata["handled_by"] = best_capability.name
            return response
        except Exception as e:
            logger.error(
                "Capability handling failed",
                extra={
                    "capability": best_capability.name,
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
            )
            return CapabilityResponse.fallback(
                "I encountered an issue processing your request. Please try again."
            )
