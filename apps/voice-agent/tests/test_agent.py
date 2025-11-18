"""Tests for VakkyaAgent implementation."""

from unittest.mock import MagicMock

import pytest

from src.agent import VakkyaAgent
from src.models import SessionUserData


class TestVakkyaAgent:
    """Test suite for VakkyaAgent."""

    def test_agent_initialization(self):
        """Test that agent initializes with correct project_id and instructions."""
        project_id = "test-project-123"
        agent = VakkyaAgent(project_id=project_id)

        assert agent.project_id == project_id
        assert agent.rag_service is None  # Not initialized until task 3
        assert "helpful voice assistant" in agent.instructions.lower()
        assert "knowledge base" in agent.instructions.lower()

    def test_agent_instructions_contain_grounding_rules(self):
        """Test that agent instructions enforce knowledge grounding."""
        agent = VakkyaAgent(project_id="test-project")

        # Verify grounding rules are present
        instructions_lower = agent.instructions.lower()
        assert (
            "only answer based on" in instructions_lower
            or "based on the context" in instructions_lower
        )
        assert (
            "don't have that information" in instructions_lower
            or "not in the" in instructions_lower
        )

    def test_on_enter_method_exists(self):
        """Test that on_enter() method exists and is properly defined."""
        agent = VakkyaAgent(project_id="test-project")

        # Verify the method exists
        assert hasattr(agent, "on_enter")
        assert callable(agent.on_enter)

        # Verify it's an async method
        import inspect

        assert inspect.iscoroutinefunction(agent.on_enter)

    @pytest.mark.asyncio
    async def test_on_user_turn_completed_without_rag(self):
        """Test that on_user_turn_completed() works without RAG service (Phase 2)."""
        agent = VakkyaAgent(project_id="test-project")

        # Mock turn context and message
        turn_ctx = MagicMock()
        new_message = MagicMock()
        new_message.text_content.return_value = "What is the weather today?"

        # Call the hook - should not raise any errors
        await agent.on_user_turn_completed(turn_ctx, new_message)

        # Verify message content was accessed
        new_message.text_content.assert_called_once()

        # In Phase 2 (no RAG), turn_ctx.add_message should not be called
        turn_ctx.add_message.assert_not_called()

    @pytest.mark.asyncio
    async def test_on_user_turn_completed_extracts_user_query(self):
        """Test that on_user_turn_completed() correctly extracts user query."""
        agent = VakkyaAgent(project_id="test-project")

        # Mock turn context and message
        turn_ctx = MagicMock()
        new_message = MagicMock()
        test_query = "How do I reset my password?"
        new_message.text_content.return_value = test_query

        # Call the hook
        await agent.on_user_turn_completed(turn_ctx, new_message)

        # Verify the query was extracted
        new_message.text_content.assert_called_once()

    @pytest.mark.asyncio
    async def test_search_documents_tool_without_rag(self):
        """Test search_documents tool returns placeholder when RAG not available."""
        agent = VakkyaAgent(project_id="test-project")

        # Mock run context
        context = MagicMock()
        context.userdata = SessionUserData(project_id="test-project")

        # Call the tool
        result = await agent.search_documents(context, query="test query")

        # Should return placeholder message
        assert isinstance(result, str)
        assert "not yet available" in result.lower() or "phase 4" in result.lower()

    @pytest.mark.asyncio
    async def test_search_documents_tool_signature(self):
        """Test that search_documents tool has correct signature and docstring."""
        agent = VakkyaAgent(project_id="test-project")

        # Verify the method exists and is callable
        assert hasattr(agent, "search_documents")
        assert callable(agent.search_documents)

        # Verify docstring exists
        assert agent.search_documents.__doc__ is not None
        assert "knowledge base" in agent.search_documents.__doc__.lower()
        assert "query" in agent.search_documents.__doc__.lower()

    def test_agent_stores_project_id(self):
        """Test that agent correctly stores project_id for RAG filtering."""
        project_id = "project-abc-123"
        agent = VakkyaAgent(project_id=project_id)

        assert agent.project_id == project_id

    @pytest.mark.asyncio
    async def test_multiple_agents_independent(self):
        """Test that multiple agent instances are independent."""
        agent1 = VakkyaAgent(project_id="project-1")
        agent2 = VakkyaAgent(project_id="project-2")

        assert agent1.project_id != agent2.project_id
        assert agent1.project_id == "project-1"
        assert agent2.project_id == "project-2"

    def test_agent_instructions_are_conversational(self):
        """Test that instructions emphasize conversational voice interaction."""
        agent = VakkyaAgent(project_id="test-project")

        instructions_lower = agent.instructions.lower()
        # Should mention voice or conversation
        assert (
            "voice" in instructions_lower
            or "conversation" in instructions_lower
            or "speak" in instructions_lower
        )
        # Should emphasize brevity
        assert "brief" in instructions_lower or "concise" in instructions_lower

    def test_lifecycle_hooks_are_defined(self):
        """Test that all required lifecycle hooks are defined."""
        agent = VakkyaAgent(project_id="test-project")

        # Verify on_enter exists
        assert hasattr(agent, "on_enter")

        # Verify on_user_turn_completed exists
        assert hasattr(agent, "on_user_turn_completed")

        # Both should be async
        import inspect

        assert inspect.iscoroutinefunction(agent.on_enter)
        assert inspect.iscoroutinefunction(agent.on_user_turn_completed)

    @pytest.mark.asyncio
    async def test_on_user_turn_completed_is_async(self):
        """Test that on_user_turn_completed is properly async."""
        agent = VakkyaAgent(project_id="test-project")

        turn_ctx = MagicMock()
        new_message = MagicMock()
        new_message.text_content.return_value = "test"

        # Should be awaitable
        result = agent.on_user_turn_completed(turn_ctx, new_message)
        assert hasattr(result, "__await__")
        await result
