"""Capability Registry for dynamic tool and instruction management.

The registry is the central component of the capability-driven architecture.
It manages capability registration, tool collection, and instruction assembly.

Usage:
    registry = CapabilityRegistry()
    registry.register(RAGCapability(rag_service))
    registry.register(FormCapability())
    
    # Get tools for agent
    tools = registry.collect_tools(session_context)
    
    # Get instruction fragments
    fragments = registry.collect_instruction_fragments(session_context)
"""

import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Callable

from .base import Capability

if TYPE_CHECKING:
    from ..models import SessionContext

logger = logging.getLogger(__name__)


@dataclass
class CapabilityRegistry:
    """Registry for managing voice agent capabilities.
    
    The registry provides:
    - Capability registration with logging
    - Dynamic tool collection from enabled capabilities
    - Instruction fragment collection for composable prompts
    - Enable/disable filtering based on session context
    
    Attributes:
        _capabilities: Internal dict mapping capability names to instances
    """
    
    _capabilities: dict[str, Capability] = field(default_factory=dict)
    
    def register(self, capability: Capability) -> None:
        """Register a capability with the registry.
        
        Args:
            capability: The capability instance to register
            
        Raises:
            ValueError: If a capability with the same name is already registered
        """
        name = capability.name
        
        if name in self._capabilities:
            logger.warning(
                "Capability already registered, replacing",
                extra={"capability": name},
            )
        
        self._capabilities[name] = capability
        logger.info(
            "Registered capability",
            extra={
                "capability": name,
                "has_tools": hasattr(capability, "get_tools"),
                "has_instructions": hasattr(capability, "get_instruction_fragment"),
            },
        )
    
    def unregister(self, name: str) -> bool:
        """Unregister a capability by name.
        
        Args:
            name: The capability name to unregister
            
        Returns:
            True if capability was removed, False if not found
        """
        if name in self._capabilities:
            del self._capabilities[name]
            logger.info("Unregistered capability", extra={"capability": name})
            return True
        return False
    
    def get(self, name: str) -> Capability | None:
        """Get a capability by name.
        
        Args:
            name: The capability name
            
        Returns:
            The capability instance or None if not found
        """
        return self._capabilities.get(name)
    
    @property
    def capabilities(self) -> list[Capability]:
        """Get list of all registered capabilities."""
        return list(self._capabilities.values())
    
    @property
    def capability_names(self) -> list[str]:
        """Get list of all registered capability names."""
        return list(self._capabilities.keys())
    
    def get_enabled_capabilities(
        self, session_context: "SessionContext"
    ) -> list[Capability]:
        """Get all capabilities enabled for this session.
        
        Filters capabilities by calling is_enabled() on each one.
        Logs which capabilities are enabled/disabled for debugging.
        
        Args:
            session_context: The session context for enable checks
            
        Returns:
            List of enabled capability instances
        """
        enabled = []
        disabled = []
        
        for capability in self._capabilities.values():
            try:
                if capability.is_enabled(session_context):
                    enabled.append(capability)
                else:
                    disabled.append(capability.name)
            except Exception as e:
                logger.error(
                    "Capability enable check failed",
                    extra={
                        "capability": capability.name,
                        "error": str(e),
                        "error_type": type(e).__name__,
                    },
                )
                # Skip capability on error
                disabled.append(capability.name)
        
        logger.info(
            "Capability enable check complete",
            extra={
                "enabled": [c.name for c in enabled],
                "disabled": disabled,
                "project_id": session_context.project_id,
            },
        )
        
        return enabled
    
    def collect_tools(
        self, session_context: "SessionContext"
    ) -> list[Callable[..., Any]]:
        """Collect all tools from enabled capabilities.
        
        Gathers tools from each enabled capability and returns a flat list.
        Logs tool collection for debugging.
        
        Args:
            session_context: The session context for tool configuration
            
        Returns:
            List of function tools from all enabled capabilities
        """
        tools: list[Callable[..., Any]] = []
        tool_sources: dict[str, int] = {}
        
        for capability in self.get_enabled_capabilities(session_context):
            try:
                cap_tools = capability.get_tools(session_context)
                if cap_tools:
                    tools.extend(cap_tools)
                    tool_sources[capability.name] = len(cap_tools)
                    logger.debug(
                        "Collected tools from capability",
                        extra={
                            "capability": capability.name,
                            "tool_count": len(cap_tools),
                            "tool_names": [getattr(t, "__name__", str(t)) for t in cap_tools],
                        },
                    )
            except Exception as e:
                logger.error(
                    "Tool collection failed for capability",
                    extra={
                        "capability": capability.name,
                        "error": str(e),
                        "error_type": type(e).__name__,
                    },
                )
                # Continue with other capabilities
        
        logger.info(
            "Tool collection complete",
            extra={
                "total_tools": len(tools),
                "sources": tool_sources,
                "project_id": session_context.project_id,
            },
        )
        
        return tools
    
    def collect_instruction_fragments(
        self, session_context: "SessionContext"
    ) -> list[str]:
        """Collect instruction fragments from enabled capabilities.
        
        Gathers instruction fragments from each enabled capability.
        Empty fragments are filtered out.
        
        Args:
            session_context: The session context for instruction customization
            
        Returns:
            List of non-empty instruction fragments
        """
        fragments: list[str] = []
        sources: list[str] = []
        
        for capability in self.get_enabled_capabilities(session_context):
            try:
                fragment = capability.get_instruction_fragment(session_context)
                if fragment and fragment.strip():
                    fragments.append(fragment.strip())
                    sources.append(capability.name)
                    logger.debug(
                        "Collected instruction fragment",
                        extra={
                            "capability": capability.name,
                            "fragment_length": len(fragment),
                        },
                    )
            except Exception as e:
                logger.error(
                    "Instruction fragment collection failed",
                    extra={
                        "capability": capability.name,
                        "error": str(e),
                        "error_type": type(e).__name__,
                    },
                )
                # Continue with other capabilities
        
        logger.info(
            "Instruction fragment collection complete",
            extra={
                "fragment_count": len(fragments),
                "sources": sources,
                "total_length": sum(len(f) for f in fragments),
                "project_id": session_context.project_id,
            },
        )
        
        return fragments
