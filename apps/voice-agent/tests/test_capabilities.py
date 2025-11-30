"""Tests for capability orchestrator and capabilities.

Tests cover:
- Capability base class interface
- Orchestrator routing logic
- RAGCapability confidence and handling
- Fallback behavior
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from src.capabilities import (
    Capability,
    CapabilityContext,
    CapabilityResponse,
    CapabilityOrchestrator,
    RAGCapability,
)


# --- Test Fixtures ---

@pytest.fixture
def context():
    """Create a basic capability context."""
    return CapabilityContext(
        user_query="What is the return policy?",
        project_id="test-project-123",
        page_url="https://example.com/products",
        session_id="session-456",
    )


@pytest.fixture
def mock_rag_service():
    """Create a mock RAG service."""
    service = MagicMock()
    service.search_formatted = AsyncMock(return_value="The return policy is 30 days.")
    return service


class MockCapability(Capability):
    """Mock capability for testing orchestrator."""
    
    def __init__(self, name: str, confidence: float, response_text: str):
        self._name = name
        self._confidence = confidence
        self._response_text = response_text
    
    @property
    def name(self) -> str:
        return self._name
    
    async def can_handle(self, context: CapabilityContext) -> float:
        return self._confidence
    
    async def handle(self, context: CapabilityContext) -> CapabilityResponse:
        return CapabilityResponse(
            text=self._response_text,
            confidence=self._confidence,
        )


# --- CapabilityResponse Tests ---

class TestCapabilityResponse:
    """Tests for CapabilityResponse dataclass."""
    
    def test_create_response(self):
        """Should create response with all fields."""
        response = CapabilityResponse(
            text="Hello",
            confidence=0.9,
            handled=True,
            metadata={"source": "test"},
        )
        assert response.text == "Hello"
        assert response.confidence == 0.9
        assert response.handled is True
        assert response.metadata == {"source": "test"}
    
    def test_default_values(self):
        """Should use default values for optional fields."""
        response = CapabilityResponse(text="Hello")
        assert response.confidence == 1.0
        assert response.handled is True
        assert response.metadata == {}
    
    def test_fallback_response(self):
        """Should create fallback response with low confidence."""
        response = CapabilityResponse.fallback()
        assert response.confidence == 0.0
        assert response.handled is False
        assert "not sure" in response.text.lower()
    
    def test_fallback_custom_message(self):
        """Should allow custom fallback message."""
        response = CapabilityResponse.fallback("Custom fallback")
        assert response.text == "Custom fallback"
        assert response.handled is False


# --- CapabilityOrchestrator Tests ---

class TestCapabilityOrchestrator:
    """Tests for CapabilityOrchestrator routing logic."""
    
    def test_register_capability(self):
        """Should register capabilities."""
        orchestrator = CapabilityOrchestrator()
        cap = MockCapability("test", 0.5, "response")
        
        orchestrator.register(cap)
        
        assert len(orchestrator.capabilities) == 1
        assert orchestrator.capabilities[0].name == "test"
    
    def test_register_multiple_capabilities(self):
        """Should register multiple capabilities."""
        orchestrator = CapabilityOrchestrator()
        orchestrator.register(MockCapability("cap1", 0.5, "r1"))
        orchestrator.register(MockCapability("cap2", 0.7, "r2"))
        
        assert len(orchestrator.capabilities) == 2
    
    @pytest.mark.asyncio
    async def test_route_to_highest_confidence(self, context):
        """Should route to capability with highest confidence."""
        orchestrator = CapabilityOrchestrator()
        orchestrator.register(MockCapability("low", 0.3, "low response"))
        orchestrator.register(MockCapability("high", 0.8, "high response"))
        orchestrator.register(MockCapability("mid", 0.5, "mid response"))
        
        response = await orchestrator.route(context)
        
        assert response.text == "high response"
        assert response.metadata["handled_by"] == "high"
    
    @pytest.mark.asyncio
    async def test_fallback_when_no_capabilities(self, context):
        """Should return fallback when no capabilities registered."""
        orchestrator = CapabilityOrchestrator()
        
        response = await orchestrator.route(context)
        
        assert response.handled is False
        assert response.confidence == 0.0
    
    @pytest.mark.asyncio
    async def test_fallback_when_below_threshold(self, context):
        """Should return fallback when all capabilities below threshold."""
        orchestrator = CapabilityOrchestrator()
        orchestrator.register(MockCapability("low", 0.05, "response"))
        
        response = await orchestrator.route(context)
        
        assert response.handled is False
    
    @pytest.mark.asyncio
    async def test_custom_fallback_message(self, context):
        """Should use custom fallback message."""
        orchestrator = CapabilityOrchestrator(fallback_message="Custom fallback")
        
        response = await orchestrator.route(context)
        
        assert response.text == "Custom fallback"
    
    @pytest.mark.asyncio
    async def test_handles_capability_evaluation_error(self, context):
        """Should continue routing when capability evaluation fails."""
        orchestrator = CapabilityOrchestrator()
        
        # Create a capability that raises during can_handle
        error_cap = MockCapability("error", 0.5, "error response")
        error_cap.can_handle = AsyncMock(side_effect=Exception("Eval error"))
        
        good_cap = MockCapability("good", 0.7, "good response")
        
        orchestrator.register(error_cap)
        orchestrator.register(good_cap)
        
        response = await orchestrator.route(context)
        
        assert response.text == "good response"
    
    @pytest.mark.asyncio
    async def test_handles_capability_handling_error(self, context):
        """Should return fallback when handling fails."""
        orchestrator = CapabilityOrchestrator()
        
        error_cap = MockCapability("error", 0.9, "error response")
        error_cap.handle = AsyncMock(side_effect=Exception("Handle error"))
        
        orchestrator.register(error_cap)
        
        response = await orchestrator.route(context)
        
        assert "issue" in response.text.lower() or "try again" in response.text.lower()


# --- RAGCapability Tests ---

class TestRAGCapability:
    """Tests for RAGCapability."""
    
    @pytest.mark.asyncio
    async def test_high_confidence_for_questions(self, mock_rag_service):
        """Should return high confidence for question queries."""
        cap = RAGCapability(mock_rag_service)
        
        question_queries = [
            "What is the return policy?",
            "How do I reset my password?",
            "Why is my order delayed?",
            "Can you explain the pricing?",
        ]
        
        for query in question_queries:
            context = CapabilityContext(user_query=query, project_id="test")
            confidence = await cap.can_handle(context)
            assert confidence >= 0.5, f"Expected high confidence for: {query}"
    
    @pytest.mark.asyncio
    async def test_lower_confidence_for_greetings(self, mock_rag_service):
        """Should return lower confidence for greetings."""
        cap = RAGCapability(mock_rag_service)
        
        greetings = ["hello", "hi there", "hey", "thanks"]
        
        for greeting in greetings:
            context = CapabilityContext(user_query=greeting, project_id="test")
            confidence = await cap.can_handle(context)
            assert confidence < 0.5, f"Expected low confidence for: {greeting}"
    
    @pytest.mark.asyncio
    async def test_zero_confidence_for_empty_query(self, mock_rag_service):
        """Should return zero confidence for empty queries."""
        cap = RAGCapability(mock_rag_service)
        context = CapabilityContext(user_query="", project_id="test")
        
        confidence = await cap.can_handle(context)
        
        assert confidence == 0.0
    
    @pytest.mark.asyncio
    async def test_handle_returns_rag_results(self, mock_rag_service, context):
        """Should return RAG search results."""
        cap = RAGCapability(mock_rag_service)
        
        response = await cap.handle(context)
        
        assert response.text == "The return policy is 30 days."
        assert response.handled is True
        assert response.metadata["rag_hit"] is True
    
    @pytest.mark.asyncio
    async def test_handle_no_results(self, mock_rag_service, context):
        """Should return helpful message when no results found."""
        mock_rag_service.search_formatted = AsyncMock(
            return_value="No relevant documents found"
        )
        cap = RAGCapability(mock_rag_service)
        
        response = await cap.handle(context)
        
        assert "couldn't find" in response.text.lower() or "rephras" in response.text.lower()
        assert response.metadata["rag_hit"] is False
    
    @pytest.mark.asyncio
    async def test_handle_search_error(self, mock_rag_service, context):
        """Should handle RAG search errors gracefully."""
        mock_rag_service.search_formatted = AsyncMock(
            side_effect=Exception("Database error")
        )
        cap = RAGCapability(mock_rag_service)
        
        response = await cap.handle(context)
        
        assert response.handled is False
        assert "try again" in response.text.lower()
    
    def test_capability_name(self, mock_rag_service):
        """Should have correct capability name."""
        cap = RAGCapability(mock_rag_service)
        assert cap.name == "rag"


# --- Integration Tests ---

class TestOrchestratorWithRAG:
    """Integration tests for orchestrator with RAG capability."""
    
    @pytest.mark.asyncio
    async def test_routes_question_to_rag(self, mock_rag_service):
        """Should route questions to RAG capability."""
        orchestrator = CapabilityOrchestrator()
        orchestrator.register(RAGCapability(mock_rag_service))
        
        context = CapabilityContext(
            user_query="What are the shipping options?",
            project_id="test-project",
        )
        
        response = await orchestrator.route(context)
        
        assert response.handled is True
        assert response.metadata.get("handled_by") == "rag"
