"""RAG service for vector search using PostgreSQL pgvector.

This module provides vector similarity search for retrieving relevant
document chunks based on user queries. It uses OpenAI embeddings and
pgvector for efficient similarity search.
"""

import logging
from dataclasses import dataclass
from typing import Optional

import asyncpg
import openai

from .models import DocumentChunk

logger = logging.getLogger(__name__)

# OpenAI embedding configuration (must match API server)
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536
DEFAULT_TOP_K = 3


@dataclass
class RAGConfig:
    """Configuration for RAG service."""

    database_url: str
    openai_api_key: str
    top_k: int = DEFAULT_TOP_K


class RAGService:
    """
    RAG service for retrieving relevant document chunks.
    
    Uses OpenAI embeddings and pgvector for vector similarity search.
    """

    def __init__(self, config: RAGConfig) -> None:
        """
        Initialize RAG service.
        
        Args:
            config: RAG configuration with database URL and OpenAI API key
        """
        self._config = config
        self._pool: Optional[asyncpg.Pool] = None
        self._openai_client = openai.AsyncOpenAI(api_key=config.openai_api_key)

    async def initialize(self) -> None:
        """
        Initialize database connection pool.
        
        Should be called before using the service.
        """
        if self._pool is not None:
            return

        try:
            self._pool = await asyncpg.create_pool(
                self._config.database_url,
                min_size=1,
                max_size=5,
            )
            logger.info("RAG service database pool initialized")
        except Exception as e:
            logger.error(
                "Failed to initialize database pool",
                extra={"error": str(e), "error_type": type(e).__name__},
            )
            raise

    async def close(self) -> None:
        """Close database connection pool."""
        if self._pool is not None:
            await self._pool.close()
            self._pool = None
            logger.info("RAG service database pool closed")

    async def search(
        self,
        query: str,
        project_id: str,
        top_k: Optional[int] = None,
    ) -> list[DocumentChunk]:
        """
        Search for relevant document chunks.
        
        Args:
            query: User query text
            project_id: Project ID to filter chunks
            top_k: Number of results to return (default: 3)
            
        Returns:
            List of relevant DocumentChunk objects
        """
        if self._pool is None:
            raise RuntimeError("RAG service not initialized. Call initialize() first.")

        k = top_k or self._config.top_k

        try:
            # Generate query embedding
            embedding = await self._generate_embedding(query)

            # Search for similar chunks
            chunks = await self._search_similar(project_id, embedding, k)

            logger.info(
                "RAG search completed",
                extra={
                    "project_id": project_id,
                    "query_length": len(query),
                    "results_count": len(chunks),
                },
            )

            return chunks

        except Exception as e:
            logger.error(
                "RAG search failed",
                extra={
                    "project_id": project_id,
                    "error": str(e),
                    "error_type": type(e).__name__,
                },
            )
            raise

    async def search_formatted(
        self,
        query: str,
        project_id: str,
        top_k: Optional[int] = None,
    ) -> str:
        """
        Search and return results as formatted string for LLM context.
        
        Args:
            query: User query text
            project_id: Project ID to filter chunks
            top_k: Number of results to return (default: 3)
            
        Returns:
            Formatted string with relevant document content
        """
        chunks = await self.search(query, project_id, top_k)
        return format_chunks_for_llm(chunks)

    async def _generate_embedding(self, text: str) -> list[float]:
        """
        Generate embedding for query text using OpenAI.
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector (1536 dimensions)
        """
        try:
            response = await self._openai_client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=text,
                dimensions=EMBEDDING_DIMENSIONS,
            )
            embedding = response.data[0].embedding

            if len(embedding) != EMBEDDING_DIMENSIONS:
                raise ValueError(
                    f"Invalid embedding dimensions: expected {EMBEDDING_DIMENSIONS}, "
                    f"got {len(embedding)}"
                )

            return embedding

        except openai.APIError as e:
            logger.error(
                "OpenAI API error during embedding generation",
                extra={"error": str(e), "error_type": type(e).__name__},
            )
            raise
        except Exception as e:
            logger.error(
                "Failed to generate embedding",
                extra={"error": str(e), "error_type": type(e).__name__},
            )
            raise

    async def _search_similar(
        self,
        project_id: str,
        embedding: list[float],
        top_k: int,
    ) -> list[DocumentChunk]:
        """
        Search for similar chunks using pgvector cosine similarity.
        
        Args:
            project_id: Project ID to filter chunks
            embedding: Query embedding vector
            top_k: Number of results to return
            
        Returns:
            List of DocumentChunk objects with similarity scores
        """
        # Format embedding as pgvector string
        embedding_str = f"[{','.join(str(x) for x in embedding)}]"

        query = """
            SELECT 
                id,
                text,
                "chunkIndex",
                1 - (embedding <=> $1::vector) as similarity
            FROM document_chunks
            WHERE "projectId" = $2
                AND embedding IS NOT NULL
            ORDER BY embedding <=> $1::vector
            LIMIT $3
        """

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, embedding_str, project_id, top_k)

        chunks = []
        for row in rows:
            chunks.append(
                DocumentChunk(
                    content=row["text"],
                    metadata={
                        "id": row["id"],
                        "chunk_index": str(row["chunkIndex"]),
                        "similarity": str(round(row["similarity"], 4)),
                    },
                )
            )

        return chunks


def format_chunks_for_llm(chunks: list[DocumentChunk]) -> str:
    """
    Format document chunks as a string for LLM context.
    
    Args:
        chunks: List of DocumentChunk objects
        
    Returns:
        Formatted string with numbered chunks
    """
    if not chunks:
        return "No relevant documents found."

    parts = []
    for i, chunk in enumerate(chunks, 1):
        similarity = chunk.metadata.get("similarity", "N/A")
        parts.append(f"[Document {i}] (relevance: {similarity})\n{chunk.content}")

    return "\n\n".join(parts)


# Factory function for creating RAG service from config
def create_rag_service(database_url: str, openai_api_key: str) -> RAGService:
    """
    Create a RAG service instance.
    
    Args:
        database_url: PostgreSQL connection URL
        openai_api_key: OpenAI API key for embeddings
        
    Returns:
        Configured RAGService instance
    """
    config = RAGConfig(
        database_url=database_url,
        openai_api_key=openai_api_key,
    )
    return RAGService(config)
