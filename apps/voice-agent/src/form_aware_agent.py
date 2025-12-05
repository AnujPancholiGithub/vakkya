"""Form-aware agent with LiveKit hooks for keyboard input handling.

This module provides a FormAwareAgent class that extends the base LiveKit Agent
with form-specific lifecycle hooks. The key hook is on_user_turn_completed, which
injects pending keyboard inputs into the chat context before the LLM processes
the user's turn.

Requirements: 1.1, 1.2, 2.1
"""

import logging
from typing import TYPE_CHECKING

from livekit.agents import Agent, ChatContext, ChatMessage

logger = logging.getLogger(__name__)


class FormAwareAgent(Agent):
    """Agent with form-aware hooks for keyboard input handling.
    
    This agent extends the base LiveKit Agent with lifecycle hooks that:
    1. Inject keyboard inputs into chat context (on_user_turn_completed)
    2. Say form greeting when agent becomes active (on_enter)
    3. Clean up state when agent exits (on_exit)
    
    The on_user_turn_completed hook is critical for keyboard input acknowledgment.
    Without it, keyboard inputs stored in pending_keyboard_inputs would never be
    injected into the LLM's chat context, and the agent wouldn't see them.
    
    Requirements: 1.1, 1.2, 2.1
    """
    
    async def on_user_turn_completed(
        self,
        turn_ctx: ChatContext,
        new_message: ChatMessage
    ) -> None:
        """Inject keyboard inputs into context before LLM processes turn.
        
        This hook is called after the user's turn ends but before the LLM
        generates a response. It's the perfect place to inject keyboard
        inputs so the agent is immediately aware of them.
        
        The hook checks for pending_keyboard_inputs in the session context,
        builds a system notification message listing all inputs, and appends
        it to the chat context. This ensures the LLM sees the keyboard inputs
        and can acknowledge them in its response.
        
        Requirements: 1.1, 1.2, 2.1
        
        Args:
            turn_ctx: Chat context containing conversation messages
            new_message: The new user message that triggered this turn
        """
        try:
            # Try to get userdata from the session
            # The userdata is set on AgentSession, and should be accessible via self._session
            ctx = None
            if hasattr(self, '_session') and self._session:
                ctx = getattr(self._session, 'userdata', None)
            
            # Fallback: try self.userdata (may work in some SDK versions)
            if ctx is None and hasattr(self, 'userdata'):
                ctx = self.userdata
            
            if ctx is None:
                logger.debug("No userdata available in on_user_turn_completed hook")
                return
            
            # Check for pending keyboard inputs
            if not hasattr(ctx, 'pending_keyboard_inputs'):
                return
            
            if not ctx.pending_keyboard_inputs:
                return
            
            # Build context message about keyboard inputs
            inputs_summary = []
            for inp in ctx.pending_keyboard_inputs:
                field_name = inp.get('field_name', 'unknown')
                value = inp.get('value', '')
                source = inp.get('source', 'keyboard')
                inputs_summary.append(
                    f"- {field_name}: {value} (via {source})"
                )
            
            input_count = len(inputs_summary)
            session_id = getattr(ctx, 'session_id', 'unknown')
            
            # Log keyboard input detection
            logger.info(
                "Keyboard inputs detected - injecting into chat context",
                extra={
                    "input_count": input_count,
                    "session_id": session_id,
                    "fields": [inp.get('field_name') for inp in ctx.pending_keyboard_inputs],
                },
            )
            
            # Create system notification message
            context_msg = (
                "SYSTEM NOTIFICATION: The user has submitted the following fields "
                "via keyboard while you were processing:\n" +
                "\n".join(inputs_summary) +
                "\n\nYou MUST acknowledge these inputs in your next response. "
                "Say something like 'I see you entered [value] for [field]. "
                "Let me continue with the next question.'"
            )
            
            # Inject as system message into chat context using the correct API
            turn_ctx.add_message(role="system", content=context_msg)
            
            # Log successful injection
            logger.info(
                "Keyboard inputs injected into chat context",
                extra={
                    "input_count": input_count,
                    "session_id": session_id,
                },
            )
            
            # Clear pending inputs after injection
            ctx.pending_keyboard_inputs.clear()
            
        except Exception as e:
            # Log error but don't raise - hooks should be resilient
            logger.error(
                "Error in on_user_turn_completed hook - continuing session",
                extra={
                    "error": str(e),
                },
                exc_info=True,
            )
    
    async def on_enter(self) -> None:
        """Called when agent becomes active.
        
        This hook is called when the agent becomes active in the session.
        Note: userdata is not available in this hook, only in on_user_turn_completed.
        
        Requirements: 2.1, 2.2
        """
        logger.debug("FormAwareAgent on_enter called")
    
    async def on_exit(self) -> None:
        """Called before agent gives control to another agent.
        
        This hook is called before the agent exits or gives control to
        another agent. Note: userdata is not available in this hook.
        
        Requirements: 6.1
        """
        logger.debug("FormAwareAgent on_exit called")
