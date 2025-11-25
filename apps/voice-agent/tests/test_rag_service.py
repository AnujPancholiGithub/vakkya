"""Tests for RAG service."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class AsyncContextManagerMock:
    """Helper class to mock async context managers."""
    
    def __init__(self, return_value):
        self.return_value = return_value
    
    async def __aenter__(self):
        return self.return_value
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        return False


from src.rag_service import (
    RAGService,
    RAGConfig,
    format_chunks_for_llm,
    create_rag_service,
    EMBEDDING_MODEL,
    EMBEDDING_DIMENSIONS,
    DEFAULT_TOP_K,
)
from src.models import DocumentChunk


# ============================================================================
# Test Fixtures
# ============================================================================


@pytest.fixture
def rag_config():
    """Create test RAG configuration."""
    return RAGConfig(
        database_url="postgresql://test:test@localhost:5432/test",
        openai_api_key="test-api-key",
        top_k=3,
    )


@pytest.fixture
def mock_embedding():
    """Create a mock embedding vector."""
    return [0.1] * EMBEDDING_DIMENSIONS


@pytest.fixture
def sample_chunks():
    """Create sample document chunks."""
    return [
        DocumentChunk(
            content="This is the first document about Python programming.",
            metadata={"id": "chunk-1", "chunk_index": "0", "similarity": "0.95"},
        ),
        DocumentChunk(
            content="This document explains how to use async/await in Python.",
            metadata={"id": "chunk-2", "chunk_index": "1", "similarity": "0.87"},
        ),
        DocumentChunk(
            content="Python is a versatile programming language.",
            metadata={"id": "chunk-3", "chunk_index": "2", "similarity": "0.82"},
        ),
    ]


# ============================================================================
# RAGConfig Tests
# ============================================================================


class TestRAGConfig:
    """Tests for RAGConfig dataclass."""

    def test_config_with_defaults(self):
        """Test config with default top_k."""
        config = RAGConfig(
            database_url="postgresql://localhost/test",
            openai_api_key="test-key",
        )
        assert config.database_url == "postgresql://localhost/test"
        assert config.openai_api_key == "test-key"
        assert config.top_k == DEFAULT_TOP_K

    def test_config_with_custom_top_k(self):
        """Test config with custom top_k."""
        config = RAGConfig(
            database_url="postgresql://localhost/test",
            openai_api_key="test-key",
            top_k=5,
        )
        assert config.top_k == 5


# ============================================================================
# RAGService Initialization Tests
# ============================================================================


class TestRAGServiceInit:
    """Tests for RAGService initialization."""

    def test_service_creation(self, rag_config):
        """Test service can be created with config."""
        service = RAGService(rag_config)
        assert service._config == rag_config
        assert service._pool is None

    @pytest.mark.asyncio
    async def test_initialize_creates_pool(self, rag_config):
        """Test initialize creates database pool."""
        service = RAGService(rag_config)

        mock_pool = AsyncMock()
        
        async def mock_create_pool(*args, **kwargs):
            return mock_pool
        
        with patch("src.rag_service.asyncpg.create_pool", side_effect=mock_create_pool) as mock_create:
            await service.initialize()

            mock_create.assert_called_once_with(
                rag_config.database_url,
                min_size=1,
                max_size=5,
            )
            assert service._pool == mock_pool

    @pytest.mark.asyncio
    async def test_initialize_idempotent(self, rag_config):
        """Test initialize is idempotent."""
        service = RAGService(rag_config)

        mock_pool = AsyncMock()
        
        async def mock_create_pool(*args, **kwargs):
            return mock_pool
        
        with patch("src.rag_service.asyncpg.create_pool", side_effect=mock_create_pool) as mock_create:
            await service.initialize()
            await service.initialize()  # Second call should be no-op

            mock_create.assert_called_once()

    @pytest.mark.asyncio
    async def test_initialize_failure(self, rag_config):
        """Test initialize handles connection failure."""
        service = RAGService(rag_config)

        with patch("src.rag_service.asyncpg.create_pool", side_effect=Exception("Connection failed")):
            with pytest.raises(Exception, match="Connection failed"):
                await service.initialize()

    @pytest.mark.asyncio
    async def test_close_pool(self, rag_config):
        """Test close closes database pool."""
        service = RAGService(rag_config)

        mock_pool = AsyncMock()
        
        async def mock_create_pool(*args, **kwargs):
            return mock_pool
        
        with patch("src.rag_service.asyncpg.create_pool", side_effect=mock_create_pool):
            await service.initialize()
            await service.close()

            mock_pool.close.assert_called_once()
            assert service._pool is None

    @pytest.mark.asyncio
    async def test_close_without_init(self, rag_config):
        """Test close is safe without initialization."""
        service = RAGService(rag_config)
        await service.close()  # Should not raise


# ============================================================================
# Embedding Generation Tests
# ============================================================================


class TestEmbeddingGeneration:
    """Tests for embedding generation."""

    @pytest.mark.asyncio
    async def test_generate_embedding_success(self, rag_config, mock_embedding):
        """Test successful embedding generation."""
        service = RAGService(rag_config)

        # Mock OpenAI response
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=mock_embedding)]

        service._openai_client.embeddings.create = AsyncMock(return_value=mock_response)

        result = await service._generate_embedding("test query")

        assert result == mock_embedding
        service._openai_client.embeddings.create.assert_called_once_with(
            model=EMBEDDING_MODEL,
            input="test query",
            dimensions=EMBEDDING_DIMENSIONS,
        )

    @pytest.mark.asyncio
    async def test_generate_embedding_invalid_dimensions(self, rag_config):
        """Test embedding with wrong dimensions raises error."""
        service = RAGService(rag_config)

        # Mock response with wrong dimensions
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=[0.1] * 100)]  # Wrong size

        service._openai_client.embeddings.create = AsyncMock(return_value=mock_response)

        with pytest.raises(ValueError, match="Invalid embedding dimensions"):
            await service._generate_embedding("test query")

    @pytest.mark.asyncio
    async def test_generate_embedding_api_error(self, rag_config):
        """Test embedding handles API errors."""
        import openai

        service = RAGService(rag_config)

        service._openai_client.embeddings.create = AsyncMock(
            side_effect=openai.APIError(
                message="API Error",
                request=MagicMock(),
                body=None,
            )
        )

        with pytest.raises(openai.APIError):
            await service._generate_embedding("test query")


# ============================================================================
# Vector Search Tests
# ============================================================================


class TestVectorSearch:
    """Tests for vector similarity search."""

    @pytest.mark.asyncio
    async def test_search_similar_success(self, rag_config, mock_embedding):
        """Test successful similarity search."""
        service = RAGService(rag_config)

        # Mock database response
        mock_rows = [
            {"id": "chunk-1", "text": "Document 1 content", "chunkIndex": 0, "similarity": 0.95},
            {"id": "chunk-2", "text": "Document 2 content", "chunkIndex": 1, "similarity": 0.87},
        ]

        mock_conn = AsyncMock()
        mock_conn.fetch = AsyncMock(return_value=mock_rows)

        # Create a proper async context manager mock
        mock_pool = MagicMock()
        mock_pool.acquire.return_value = AsyncContextManagerMock(mock_conn)

        service._pool = mock_pool

        result = await service._search_similar("project-123", mock_embedding, 3)

        assert len(result) == 2
        assert result[0].content == "Document 1 content"
        assert result[0].metadata["similarity"] == "0.95"
        assert result[1].content == "Document 2 content"

    @pytest.mark.asyncio
    async def test_search_similar_empty_results(self, rag_config, mock_embedding):
        """Test search with no results."""
        service = RAGService(rag_config)

        mock_conn = AsyncMock()
        mock_conn.fetch = AsyncMock(return_value=[])

        mock_pool = MagicMock()
        mock_pool.acquire.return_value = AsyncContextManagerMock(mock_conn)

        service._pool = mock_pool

        result = await service._search_similar("project-123", mock_embedding, 3)

        assert len(result) == 0


# ============================================================================
# Search Integration Tests
# ============================================================================


class TestSearchIntegration:
    """Tests for the main search method."""

    @pytest.mark.asyncio
    async def test_search_not_initialized(self, rag_config):
        """Test search raises error when not initialized."""
        service = RAGService(rag_config)

        with pytest.raises(RuntimeError, match="not initialized"):
            await service.search("test query", "project-123")

    @pytest.mark.asyncio
    async def test_search_success(self, rag_config, mock_embedding):
        """Test successful search flow."""
        service = RAGService(rag_config)

        # Mock embedding generation
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=mock_embedding)]
        service._openai_client.embeddings.create = AsyncMock(return_value=mock_response)

        # Mock database
        mock_rows = [
            {"id": "chunk-1", "text": "Relevant content", "chunkIndex": 0, "similarity": 0.92},
        ]
        mock_conn = AsyncMock()
        mock_conn.fetch = AsyncMock(return_value=mock_rows)

        mock_pool = MagicMock()
        mock_pool.acquire.return_value = AsyncContextManagerMock(mock_conn)

        service._pool = mock_pool

        result = await service.search("test query", "project-123")

        assert len(result) == 1
        assert result[0].content == "Relevant content"

    @pytest.mark.asyncio
    async def test_search_with_custom_top_k(self, rag_config, mock_embedding):
        """Test search with custom top_k."""
        service = RAGService(rag_config)

        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=mock_embedding)]
        service._openai_client.embeddings.create = AsyncMock(return_value=mock_response)

        mock_conn = AsyncMock()
        mock_conn.fetch = AsyncMock(return_value=[])

        mock_pool = MagicMock()
        mock_pool.acquire.return_value = AsyncContextManagerMock(mock_conn)

        service._pool = mock_pool

        await service.search("test query", "project-123", top_k=5)

        # Verify top_k was passed to query
        call_args = mock_conn.fetch.call_args
        assert call_args[0][3] == 5  # Fourth argument is top_k

    @pytest.mark.asyncio
    async def test_search_formatted(self, rag_config, mock_embedding):
        """Test search_formatted returns formatted string."""
        service = RAGService(rag_config)

        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=mock_embedding)]
        service._openai_client.embeddings.create = AsyncMock(return_value=mock_response)

        mock_rows = [
            {"id": "chunk-1", "text": "First document", "chunkIndex": 0, "similarity": 0.95},
            {"id": "chunk-2", "text": "Second document", "chunkIndex": 1, "similarity": 0.87},
        ]
        mock_conn = AsyncMock()
        mock_conn.fetch = AsyncMock(return_value=mock_rows)

        mock_pool = MagicMock()
        mock_pool.acquire.return_value = AsyncContextManagerMock(mock_conn)

        service._pool = mock_pool

        result = await service.search_formatted("test query", "project-123")

        assert "[Document 1]" in result
        assert "First document" in result
        assert "[Document 2]" in result
        assert "Second document" in result


# ============================================================================
# Format Chunks Tests
# ============================================================================


class TestFormatChunks:
    """Tests for chunk formatting."""

    def test_format_empty_chunks(self):
        """Test formatting empty chunk list."""
        result = format_chunks_for_llm([])
        assert result == "No relevant documents found."

    def test_format_single_chunk(self):
        """Test formatting single chunk."""
        chunks = [
            DocumentChunk(
                content="Test content",
                metadata={"similarity": "0.95"},
            )
        ]
        result = format_chunks_for_llm(chunks)

        assert "[Document 1]" in result
        assert "(relevance: 0.95)" in result
        assert "Test content" in result

    def test_format_multiple_chunks(self, sample_chunks):
        """Test formatting multiple chunks."""
        result = format_chunks_for_llm(sample_chunks)

        assert "[Document 1]" in result
        assert "[Document 2]" in result
        assert "[Document 3]" in result
        assert "Python programming" in result
        assert "async/await" in result

    def test_format_chunk_without_similarity(self):
        """Test formatting chunk without similarity metadata."""
        chunks = [
            DocumentChunk(
                content="Test content",
                metadata={},
            )
        ]
        result = format_chunks_for_llm(chunks)

        assert "(relevance: N/A)" in result


# ============================================================================
# Factory Function Tests
# ============================================================================


class TestCreateRAGService:
    """Tests for factory function."""

    def test_create_rag_service(self):
        """Test factory creates service with correct config."""
        service = create_rag_service(
            database_url="postgresql://localhost/test",
            openai_api_key="test-key",
        )

        assert isinstance(service, RAGService)
        assert service._config.database_url == "postgresql://localhost/test"
        assert service._config.openai_api_key == "test-key"
        assert service._config.top_k == DEFAULT_TOP_K


# ============================================================================
# Constants Tests
# ============================================================================


class TestConstants:
    """Tests for module constants."""

    def test_embedding_model(self):
        """Test embedding model matches API server."""
        assert EMBEDDING_MODEL == "text-embedding-3-small"

    def test_embedding_dimensions(self):
        """Test embedding dimensions match API server."""
        assert EMBEDDING_DIMENSIONS == 1536

    def test_default_top_k(self):
        """Test default top_k is 3."""
        assert DEFAULT_TOP_K == 3
