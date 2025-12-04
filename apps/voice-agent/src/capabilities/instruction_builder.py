"""Instruction Builder for composable agent prompts.

The InstructionBuilder composes agent instructions from multiple sources:
1. Base instructions (greeting, tone, communication style)
2. Custom system prompt (from project owner)
3. Capability-specific instructions (appended dynamically)
4. Context (page URL, etc.)

This allows project owners to customize their agent's persona while
capabilities add their own guidance without replacing the base prompt.

Usage:
    builder = InstructionBuilder(registry)
    instructions = builder.build(session_context, agent_config)
"""

import logging
from typing import TYPE_CHECKING, Optional

from .registry import CapabilityRegistry

if TYPE_CHECKING:
    from ..models import AgentConfig, SessionContext

logger = logging.getLogger(__name__)


class InstructionBuilder:
    """Builds agent instructions from multiple sources.
    
    The builder composes instructions in a specific order:
    1. Base instructions - greeting, tone, communication style
    2. Custom system prompt - project owner's custom instructions
    3. Capability instructions - appended from enabled capabilities
    4. Context - current page URL and other runtime context
    
    This composition ensures:
    - Project owner's custom prompt is respected
    - Capabilities enhance rather than replace instructions
    - All agents have consistent base behavior
    """
    
    def __init__(self, registry: CapabilityRegistry):
        """Initialize the instruction builder.
        
        Args:
            registry: The capability registry for collecting instruction fragments
        """
        self._registry = registry
    
    def build(
        self,
        session_context: "SessionContext",
        agent_config: Optional["AgentConfig"] = None,
    ) -> str:
        """Build complete agent instructions.
        
        Composes instructions from all sources in order:
        1. Base instructions (greeting, tone)
        2. Custom system prompt (if provided)
        3. Capability-specific instructions
        4. Context (page URL, etc.)
        
        Args:
            session_context: The session context with project state
            agent_config: Optional custom agent configuration
            
        Returns:
            Complete instruction string for the agent
        """
        sections: list[str] = []
        
        # 1. Base instructions
        base = self._get_base_instructions(agent_config)
        sections.append(base)
        
        # 2. Custom system prompt (if provided)
        if agent_config and agent_config.system_prompt:
            sections.append(f"\n## Custom Instructions\n{agent_config.system_prompt}")
            logger.debug(
                "Added custom system prompt",
                extra={"prompt_length": len(agent_config.system_prompt)},
            )
        
        # 3. Capability instructions
        fragments = self._registry.collect_instruction_fragments(session_context)
        if fragments:
            capability_section = "\n## Available Capabilities\n\n" + "\n\n".join(fragments)
            sections.append(capability_section)
            logger.debug(
                "Added capability instructions",
                extra={"fragment_count": len(fragments)},
            )
        
        # 4. Context
        context_section = self._get_context_section(session_context)
        if context_section:
            sections.append(context_section)
        
        # Compose final instructions
        instructions = "\n".join(sections)
        
        logger.info(
            "Built agent instructions",
            extra={
                "total_length": len(instructions),
                "has_custom_prompt": agent_config is not None and agent_config.system_prompt is not None,
                "capability_fragments": len(fragments) if fragments else 0,
                "has_context": context_section is not None,
                "project_id": session_context.project_id,
            },
        )
        
        return instructions
    
    def _get_base_instructions(
        self, agent_config: Optional["AgentConfig"] = None
    ) -> str:
        """Get base instructions for all agents.
        
        Provides consistent greeting, tone, and communication style
        that applies to all agents regardless of capabilities.
        
        Args:
            agent_config: Optional config for agent name customization
            
        Returns:
            Base instruction string
        """
        agent_name = "a helpful voice assistant"
        if agent_config and agent_config.agent_name:
            agent_name = agent_config.agent_name
        
        return f"""You are {agent_name}.

## Communication Style
- Be conversational and concise
- Speak naturally as if having a real conversation
- Keep responses brief unless more detail is needed
- Be friendly and helpful, like a knowledgeable colleague
- Confident when you have good information, humble when uncertain

## Response Guidelines
- Give direct answers first, then brief explanation if needed
- Keep responses to 1-3 sentences for simple questions
- For complex topics, break into digestible points
- Use natural, conversational language - avoid robotic phrasing
- Never fabricate information - say "I don't know" if unsure"""
    
    def _get_context_section(
        self, session_context: "SessionContext"
    ) -> Optional[str]:
        """Get context section with runtime information.
        
        Adds current page URL and other relevant context.
        
        Args:
            session_context: The session context with page info
            
        Returns:
            Context section string or None if no context
        """
        context_parts: list[str] = []
        
        # Page context
        if session_context.page_context and session_context.page_context.url:
            context_parts.append(f"User is currently viewing: {session_context.page_context.url}")
        
        if not context_parts:
            return None
        
        return "\n## Current Context\n" + "\n".join(context_parts)
