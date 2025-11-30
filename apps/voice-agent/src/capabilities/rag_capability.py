"""RAG capability for answering questions from uploaded documents.

This capability searches the project's knowledge base (uploaded PDFs, TXT, MD files)
and generates answers based on relevant document chunks.
"""

import logging
from typing import Optional

from .base import Capability, CapabilityContext, CapabilityResponse

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
    
    Attributes:
        rag_service: The RAG service for vector search
    """
    
    def __init__(self, rag_service) -> None:
        """Initialize RAG capability.
        
        Args:
            rag_service: RAGService instance for document search
        """
        self._rag_service = rag_service
        self._no_docs_message = (
            "I don't have any documents to search. "
            "Please upload some documents to the project first."
        )
        self._no_results_message = (
            "I couldn't find relevant information in the uploaded documents. "
            "Could you try rephrasing your question?"
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
        
        Args:
            context: Request context with user query and project ID
            
        Returns:
            CapabilityResponse with answer text and metadata
        """
        try:
            # Search for relevant documents
            result = await self._rag_service.search_formatted(
                query=context.user_query,
                project_id=context.project_id,
                top_k=3,
            )
            
            # Check if we found relevant results
            no_results_indicator = "No relevant documents found"
            if result == no_results_indicator or not result:
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
                    metadata={"rag_hit": False},
                )
            
            logger.info(
                "RAG search successful",
                extra={
                    "project_id": context.project_id,
                    "result_length": len(result),
                },
            )
            
            return CapabilityResponse(
                text=result,
                confidence=DEFAULT_RAG_CONFIDENCE,
                handled=True,
                metadata={"rag_hit": True},
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
