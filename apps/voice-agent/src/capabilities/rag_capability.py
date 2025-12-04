"""RAG capability for answering questions from uploaded documents.

This capability searches the project's knowledge base (uploaded PDFs, TXT, MD files)
and generates answers based on relevant document chunks.

Enhanced with dynamic tool and instruction support for capability-driven architecture.
"""

import logging
from typing import TYPE_CHECKING, Any, Callable

from livekit.agents import RunContext, function_tool

from .base import Capability, CapabilityContext, CapabilityResponse
from ..models import DocumentChunk
from ..rag_service import (
    LOW_CONFIDENCE_THRESHOLD,
    format_chunks_for_llm,
    get_max_similarity,
)

if TYPE_CHECKING:
    from ..models import SessionContext

logger = logging.getLogger(__name__)

# Confidence threshold for RAG results
# Below this, we return "I don't know" instead of potentially wrong answers
RAG_CONFIDENCE_THRESHOLD = 0.3

# Default confidence when RAG has documents to search
DEFAULT_RAG_CONFIDENCE = 0.7


class RAGCapability(Capability):
    """Capability for answering questions using RAG (Retrieval-Augmented Generation).
    
    Searches uploaded documents for relevant context and generates answers.
    Returns low confidence when no relevant documents are found.
    
    Enhanced Interface:
    - is_enabled(): Returns True if RAG service is available
    - get_tools(): Returns search_knowledge tool
    - get_instruction_fragment(): Returns RAG-specific instructions
    
    Attributes:
        rag_service: The RAG service for vector search
    """
    
    def __init__(self, rag_service=None) -> None:
        """Initialize RAG capability.
        
        Args:
            rag_service: RAGService instance for document search (optional for deferred init)
        """
        self._rag_service = rag_service
        self._no_docs_message = (
            "I don't have any documents to search. "
            "Please upload some documents to the project first."
        )
        self._no_results_message = (
            "I don't have information about that in my knowledge base. "
            "Could you try asking something else, or rephrase your question?"
        )
        self._low_confidence_message = (
            "I'm not entirely sure, but based on what I found, here's what might help:"
        )
    
    @property
    def name(self) -> str:
        return "rag"
    
    async def can_handle(self, context: CapabilityContext) -> float:
        """Determine if RAG can handle this query.
        
        RAG can potentially handle any question-like query when documents exist.
        Returns high confidence for question patterns, lower for commands.
        
        Args:
            context: Request context with user query
            
        Returns:
            Confidence score (0.0-1.0)
        """
        query = context.user_query.lower().strip()
        
        # Empty queries can't be handled
        if not query:
            return 0.0
        
        # Question indicators boost confidence
        question_starters = [
            "what", "how", "why", "when", "where", "who", "which",
            "can you", "could you", "tell me", "explain", "describe",
            "is there", "are there", "do you", "does",
        ]
        
        is_question = any(query.startswith(starter) for starter in question_starters)
        has_question_mark = "?" in context.user_query
        
        if is_question or has_question_mark:
            return DEFAULT_RAG_CONFIDENCE
        
        # Commands and greetings get lower confidence
        command_patterns = ["hello", "hi", "hey", "thanks", "thank you", "bye", "goodbye"]
        if any(query.startswith(pattern) for pattern in command_patterns):
            return 0.2
        
        # Default moderate confidence for other queries
        return 0.5
    
    async def handle(self, context: CapabilityContext) -> CapabilityResponse:
        """Search documents and generate an answer.
        
        Uses similarity scores to determine confidence:
        - High similarity (>=0.5): Return results with high confidence
        - Low similarity (<0.5): Return results with uncertainty indicator
        - No results: Return "I don't know" message
        
        Args:
            context: Request context with user query and project ID
            
        Returns:
            CapabilityResponse with answer text and metadata
        """
        try:
            # Search for relevant documents (get raw chunks for similarity analysis)
            chunks = await self._rag_service.search(
                query=context.user_query,
                project_id=context.project_id,
                top_k=3,
            )
            
            # No results found
            if not chunks:
                logger.info(
                    "RAG search returned no results",
                    extra={
                        "project_id": context.project_id,
                        "query_length": len(context.user_query),
                    },
                )
                return CapabilityResponse(
                    text=self._no_results_message,
                    confidence=RAG_CONFIDENCE_THRESHOLD,
                    handled=True,
                    metadata={"rag_hit": False, "max_similarity": 0.0},
                )
            
            # Get max similarity score
            max_similarity = get_max_similarity(chunks)
            
            # Format chunks for response
            result = format_chunks_for_llm(chunks)
            
            # Check if results are low confidence
            if max_similarity < LOW_CONFIDENCE_THRESHOLD:
                logger.info(
                    "RAG search returned low confidence results",
                    extra={
                        "project_id": context.project_id,
                        "max_similarity": max_similarity,
                        "query_length": len(context.user_query),
                    },
                )
                return CapabilityResponse(
                    text=self._low_confidence_message + "\n\n" + result,
                    confidence=max_similarity,
                    handled=True,
                    metadata={
                        "rag_hit": True,
                        "low_confidence": True,
                        "max_similarity": max_similarity,
                    },
                )
            
            logger.info(
                "RAG search successful",
                extra={
                    "project_id": context.project_id,
                    "max_similarity": max_similarity,
                    "result_length": len(result),
                },
            )
            
            return CapabilityResponse(
                text=result,
                confidence=DEFAULT_RAG_CONFIDENCE,
                handled=True,
                metadata={
                    "rag_hit": True,
                    "low_confidence": False,
                    "max_similarity": max_similarity,
                },
            )
            
        except Exception as e:
            logger.error(
                "RAG search failed",
                extra={
                    "project_id": context.project_id,
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
            )
            return CapabilityResponse(
                text="I couldn't search the knowledge base right now. Please try again.",
                confidence=0.0,
                handled=False,
                metadata={"error": str(e)},
            )
    
    # =========================================================================
    # Enhanced Interface (for capability-driven agent architecture)
    # =========================================================================
    
    def is_enabled(self, session_context: "SessionContext") -> bool:
        """Check if RAG capability should be enabled.
        
        RAG is enabled if a RAG service is available.
        
        Args:
            session_context: The session context
            
        Returns:
            True if RAG service is available
        """
        return self._rag_service is not None
    
    def get_tools(self, session_context: "SessionContext") -> list[Callable[..., Any]]:
        """Return RAG-related tools.
        
        Provides the search_knowledge tool for querying the knowledge base.
        
        Args:
            session_context: The session context for tool configuration
            
        Returns:
            List containing the search_knowledge tool
        """
        if not self._rag_service:
            return []
        
        # Create the search tool with access to RAG service
        rag_service = self._rag_service
        
        @function_tool()
        async def search_knowledge(
            context: RunContext[Any],
            query: str,
        ) -> str:
            """Search the knowledge base for information relevant to the user's question.

            Use this tool when the user asks a question that might be answered by
            the project's uploaded documents. This searches through PDFs, text files,
            and markdown documents that have been uploaded to the project.

            Args:
                query: The search query based on what the user is asking about.
                       Be specific and include key terms from the user's question.

            Returns:
                Relevant document excerpts that can help answer the user's question,
                or a message indicating no relevant documents were found.
            """
            ctx = context.userdata
            project_id = ctx.project_id if ctx else session_context.project_id
            
            try:
                chunks = await rag_service.search(
                    query=query,
                    project_id=project_id,
                    top_k=3,
                )
                
                if not chunks:
                    logger.info(
                        "RAG search returned no results",
                        extra={"project_id": project_id, "query_length": len(query)},
                    )
                    return "No relevant information found in the knowledge base."
                
                max_similarity = get_max_similarity(chunks)
                result = format_chunks_for_llm(chunks)
                
                if max_similarity < LOW_CONFIDENCE_THRESHOLD:
                    result = f"[Low confidence results - relevance scores below 0.5]\n\n{result}"
                
                logger.info(
                    "RAG search completed",
                    extra={
                        "project_id": project_id,
                        "query_length": len(query),
                        "num_results": len(chunks),
                        "max_similarity": round(max_similarity, 3),
                    },
                )
                
                return result
                
            except Exception as e:
                logger.error(
                    "RAG search failed",
                    extra={
                        "project_id": project_id,
                        "error": str(e),
                        "error_type": type(e).__name__,
                    },
                )
                return "I couldn't search the knowledge base right now. Please try rephrasing your question."
        
        return [search_knowledge]
    
    def get_instruction_fragment(self, session_context: "SessionContext") -> str:
        """Return RAG-specific instructions.
        
        Provides guidance on using the knowledge base search.
        
        Args:
            session_context: The session context
            
        Returns:
            RAG instruction fragment
        """
        return """### Knowledge Base Search
You have access to a knowledge base of uploaded documents (PDFs, text files, markdown).

**When to use search_knowledge:**
- When the user asks a question that might be answered by project documents
- When you need factual information about the project or company
- When the user asks "what", "how", "why", "when", "where" questions

**How to use it:**
- Be specific with your search query
- Include key terms from the user's question
- If results have low confidence, acknowledge uncertainty
- Never fabricate information - say "I don't know" if unsure"""
