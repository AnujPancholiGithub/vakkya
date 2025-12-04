"""Capability modules for voice agent orchestration.

This module provides the capability-driven architecture for the voice agent:
- Capability: Base class for all capabilities
- CapabilityRegistry: Central registry for capability management
- InstructionBuilder: Composes agent instructions from multiple sources
- Individual capabilities: RAG, Forms, etc.
"""

from .base import Capability, CapabilityContext, CapabilityResponse
from .core_capability import CoreCapability
from .form_capability import FormCapabilityV2, FormContext, FormStateEnum, FORM_STATE_KEY
from .instruction_builder import InstructionBuilder
from .orchestrator import CapabilityOrchestrator
from .rag_capability import RAGCapability
from .registry import CapabilityRegistry

# Alias for backwards compatibility
FormCapability = FormCapabilityV2

__all__ = [
    # Base classes
    "Capability",
    "CapabilityContext",
    "CapabilityResponse",
    # Registry and builder
    "CapabilityRegistry",
    "InstructionBuilder",
    # Orchestrator (legacy)
    "CapabilityOrchestrator",
    # Core capability (always-on)
    "CoreCapability",
    # Form capability
    "FormCapability",
    "FormCapabilityV2",
    "FormContext",
    "FormStateEnum",
    "FORM_STATE_KEY",
    # RAG capability
    "RAGCapability",
]
