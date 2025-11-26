"""Test to verify project setup and dependencies."""

import sys


def test_python_version():
    """Verify Python version is 3.12.x"""
    assert sys.version_info.major == 3
    assert sys.version_info.minor == 12


def test_livekit_agents_import():
    """Verify LiveKit Agents SDK can be imported"""
    import livekit.agents
    
    assert hasattr(livekit.agents, 'JobContext')
    assert hasattr(livekit.agents, 'WorkerOptions')


def test_asyncpg_import():
    """Verify asyncpg can be imported"""
    import asyncpg
    
    assert hasattr(asyncpg, 'connect')
    assert hasattr(asyncpg, 'create_pool')


def test_pydantic_import():
    """Verify Pydantic can be imported"""
    import pydantic
    from pydantic import BaseModel
    
    class TestModel(BaseModel):
        name: str
    
    model = TestModel(name="test")
    assert model.name == "test"


def test_structlog_import():
    """Verify structlog can be imported"""
    import structlog
    
    assert hasattr(structlog, 'get_logger')


def test_httpx_import():
    """Verify httpx can be imported"""
    import httpx
    
    assert hasattr(httpx, 'AsyncClient')


def test_openai_import():
    """Verify OpenAI SDK can be imported"""
    import openai
    
    assert hasattr(openai, 'AsyncOpenAI')
