"""VakkyaAgent - Main agent implementation using LiveKit Agent SDK patterns."""

from livekit.agents import Agent, ChatContext, ChatMessage, RunContext, function_tool

from .models import SessionUserData


class VakkyaAgent(Agent):
    """Voice agent for Vakkya using LiveKit Agent SDK best practices.

    This agent handles real-time voice conversations with RAG-enhanced responses.
    It follows the official LiveKit pattern of using lifecycle hooks for behavior.

    Architecture:
        - AgentSession configures STT/LLM/TTS pipeline
        - VakkyaAgent implements behavior via lifecycle hooks
        - RAG injection happens in on_user_turn_completed()
    """

    def __init__(self, project_id: str):
        """Initialize the Vakkya agent.

        Args:
            project_id: The project identifier for this session
        """
        super().__init__(
            instructions="""You are a helpful voice assistant for Vakkya.

Your role is to answer user questions based on the knowledge base provided to you.

Important guidelines:
- Only answer based on the context from the knowledge base
- If information is not in the provided context, say "I don't have that
  information in my knowledge base"
- Be concise and conversational in your responses
- Speak naturally as if having a voice conversation
- Don't mention that you're reading from a knowledge base or context
- If asked about something outside the knowledge base, politely redirect to topics you can help with

Keep responses brief and to the point since this is a voice conversation."""
        )
        self.project_id = project_id
        # RAG service will be initialized when task 3 is complete
        self.rag_service = None

    async def on_enter(self) -> None:
        """Called when agent becomes active in the session.

        This hook is triggered when the agent first enters the conversation.
        We use it to greet the user warmly.
        """
        await self.session.generate_reply(
            instructions=(
                "Greet the user warmly and ask how you can help them today. "
                "Keep it brief and friendly."
            )
        )

    async def on_user_turn_completed(
        self,
        turn_ctx: ChatContext,
        new_message: ChatMessage,
    ) -> None:
        """Called after user finishes speaking, before LLM generates response.

        This is the official LiveKit hook for RAG injection. It's called after
        the user's turn is complete but before the LLM generates a response.

        Args:
            turn_ctx: The chat context for this turn (can be modified)
            new_message: The user's message that just completed
        """
        # Extract user's query
        new_message.text_content()

        # TODO: When task 3 (RAG service) is complete, uncomment this:
        # if self.rag_service:
        #     # Query pgvector for relevant context
        #     rag_results = await self.rag_service.query(
        #         query_text=user_query,
        #         project_id=self.project_id,
        #         top_k=3
        #     )
        #
        #     # Inject RAG context into the turn (official LiveKit pattern)
        #     if rag_results:
        #         context_text = "\n\n".join([
        #             f"Document excerpt: {chunk.content}"
        #             for chunk in rag_results
        #         ])
        #         turn_ctx.add_message(
        #             role="assistant",
        #             content=f"Relevant context from knowledge base:\n{context_text}"
        #         )

        # For now (Phase 2 - No RAG), we just let the LLM respond without RAG context
        # The agent will still work, just without document-based knowledge
        pass

    @function_tool()
    async def search_documents(
        self,
        context: RunContext[SessionUserData],
        query: str,
    ) -> str:
        """Search the knowledge base for specific information.

        Use this tool when you need to find specific information from the
        knowledge base to answer the user's question.

        Args:
            context: The run context containing session user data
            query: The search query to find relevant documents

        Returns:
            Relevant document excerpts from the knowledge base
        """
        # TODO: When task 3 (RAG service) is complete, uncomment this:
        # if self.rag_service:
        #     results = await self.rag_service.query(
        #         query_text=query,
        #         project_id=context.userdata.project_id,
        #         top_k=5
        #     )
        #     if results:
        #         return "\n\n".join([
        #             f"Document {i+1}: {chunk.content}"
        #             for i, chunk in enumerate(results)
        #         ])
        #     return "No relevant documents found in the knowledge base."

        # For now (Phase 2 - No RAG), return a placeholder
        return (
            "Knowledge base search is not yet available. "
            "RAG service will be integrated in Phase 4."
        )
