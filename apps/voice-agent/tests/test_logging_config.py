"""Tests for logging configuration."""

import json
import logging
import os
from io import StringIO

import pytest
import structlog

from src.logging_config import (
    bind_context,
    clear_context,
    configure_logging,
    get_logger,
    unbind_context,
)


@pytest.fixture(autouse=True)
def reset_logging():
    """Reset logging configuration before each test."""
    # Clear any existing handlers
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Clear structlog context
    clear_context()
    
    yield
    
    # Cleanup after test
    clear_context()


@pytest.fixture
def capture_logs():
    """Capture log output to a string buffer."""
    # Clear any existing handlers first
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    stream = StringIO()
    handler = logging.StreamHandler(stream)
    handler.setLevel(logging.DEBUG)
    
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.DEBUG)
    
    yield stream
    
    root_logger.removeHandler(handler)


class TestConfigureLogging:
    """Tests for configure_logging function."""
    
    def test_configure_logging_default_level(self, capture_logs):
        """Test that logging is configured with default INFO level."""
        configure_logging()
        
        logger = get_logger(__name__)
        logger.info("test message")
        
        output = capture_logs.getvalue()
        assert "test message" in output
    
    def test_configure_logging_debug_level(self, capture_logs):
        """Test that DEBUG level logs are captured when configured."""
        configure_logging(log_level="DEBUG")
        
        logger = get_logger(__name__)
        logger.debug("debug message")
        
        output = capture_logs.getvalue()
        assert "debug message" in output
    
    def test_configure_logging_from_env(self, monkeypatch):
        """Test that log level can be set via LOG_LEVEL environment variable."""
        # Set environment before reset_logging fixture runs
        monkeypatch.setenv("LOG_LEVEL", "ERROR")
        monkeypatch.setenv("ENVIRONMENT", "production")
        
        # Clear handlers manually
        root_logger = logging.getLogger()
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)
        
        # Configure logging
        configure_logging()
        
        # Verify root logger level was set correctly
        assert root_logger.level == logging.ERROR
    
    def test_configure_logging_production_json(self, capture_logs, monkeypatch):
        """Test that production environment outputs JSON logs."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        configure_logging()
        
        logger = get_logger(__name__)
        logger.info("test event", key="value")
        
        output = capture_logs.getvalue()
        
        # Should be valid JSON
        try:
            log_entry = json.loads(output.strip())
            assert log_entry["event"] == "test event"
            assert log_entry["key"] == "value"
            assert "timestamp" in log_entry
            assert log_entry["level"] == "info"
        except json.JSONDecodeError:
            pytest.fail(f"Output is not valid JSON: {output}")
    
    def test_configure_logging_development_pretty(self, capture_logs, monkeypatch):
        """Test that development environment outputs pretty-printed logs."""
        monkeypatch.setenv("ENVIRONMENT", "development")
        configure_logging()
        
        logger = get_logger(__name__)
        logger.info("test event", key="value")
        
        output = capture_logs.getvalue()
        
        # Should be human-readable, not JSON
        assert "test event" in output
        assert "key" in output or "value" in output
        # Should not be valid JSON
        with pytest.raises(json.JSONDecodeError):
            json.loads(output.strip())


class TestGetLogger:
    """Tests for get_logger function."""
    
    def test_get_logger_basic(self):
        """Test that get_logger returns a structlog logger."""
        configure_logging()
        logger = get_logger(__name__)
        
        # Logger should be a BoundLogger or BoundLoggerLazyProxy
        assert logger is not None
        assert hasattr(logger, 'info')
        assert hasattr(logger, 'debug')
        assert hasattr(logger, 'error')
    
    def test_get_logger_with_initial_context(self, capture_logs, monkeypatch):
        """Test that get_logger can bind initial context."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        configure_logging()
        
        logger = get_logger(__name__, session_id="test_session", project_id="test_project")
        logger.info("test message")
        
        output = capture_logs.getvalue()
        log_entry = json.loads(output.strip())
        
        assert log_entry["session_id"] == "test_session"
        assert log_entry["project_id"] == "test_project"
    
    def test_get_logger_multiple_calls(self):
        """Test that multiple get_logger calls work correctly."""
        configure_logging()
        
        logger1 = get_logger("module1")
        logger2 = get_logger("module2")
        
        assert logger1 is not None
        assert logger2 is not None


class TestContextManagement:
    """Tests for context binding functions."""
    
    def test_bind_context(self, capture_logs, monkeypatch):
        """Test that bind_context adds context to subsequent logs."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        configure_logging()
        
        bind_context(session_id="abc123", project_id="proj_456")
        
        logger = get_logger(__name__)
        logger.info("test message")
        
        output = capture_logs.getvalue()
        log_entry = json.loads(output.strip())
        
        assert log_entry["session_id"] == "abc123"
        assert log_entry["project_id"] == "proj_456"
    
    def test_unbind_context(self, capture_logs, monkeypatch):
        """Test that unbind_context removes specific keys."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        configure_logging()
        
        bind_context(session_id="abc123", project_id="proj_456", user_id="user_789")
        unbind_context("user_id")
        
        logger = get_logger(__name__)
        logger.info("test message")
        
        output = capture_logs.getvalue()
        log_entry = json.loads(output.strip())
        
        assert log_entry["session_id"] == "abc123"
        assert log_entry["project_id"] == "proj_456"
        assert "user_id" not in log_entry
    
    def test_clear_context(self, capture_logs, monkeypatch):
        """Test that clear_context removes all context."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        configure_logging()
        
        bind_context(session_id="abc123", project_id="proj_456")
        clear_context()
        
        logger = get_logger(__name__)
        logger.info("test message")
        
        output = capture_logs.getvalue()
        log_entry = json.loads(output.strip())
        
        assert "session_id" not in log_entry
        assert "project_id" not in log_entry
    
    def test_context_isolation(self, capture_logs, monkeypatch):
        """Test that context doesn't leak between loggers."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        configure_logging()
        
        # Logger 1 with context
        logger1 = get_logger("logger1", session_id="session1")
        
        # Logger 2 without context
        logger2 = get_logger("logger2")
        
        # Clear buffer
        capture_logs.truncate(0)
        capture_logs.seek(0)
        
        # Log with logger2
        logger2.info("test message")
        
        output = capture_logs.getvalue()
        log_entry = json.loads(output.strip())
        
        # Logger2 should not have logger1's context
        assert "session_id" not in log_entry or log_entry.get("session_id") != "session1"


class TestLogLevels:
    """Tests for different log levels."""
    
    def test_all_log_levels(self, capture_logs, monkeypatch):
        """Test that all log levels work correctly."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        configure_logging(log_level="DEBUG")
        
        logger = get_logger(__name__)
        
        logger.debug("debug message")
        logger.info("info message")
        logger.warning("warning message")
        logger.error("error message")
        
        output = capture_logs.getvalue()
        lines = [line for line in output.strip().split("\n") if line]
        
        assert len(lines) == 4
        
        # Parse each line and check level
        levels = []
        for line in lines:
            log_entry = json.loads(line)
            levels.append(log_entry["level"])
        
        assert "debug" in levels
        assert "info" in levels
        assert "warning" in levels
        assert "error" in levels


class TestExceptionLogging:
    """Tests for exception logging."""
    
    def test_exception_logging(self, capture_logs, monkeypatch):
        """Test that exceptions are properly formatted in logs."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        configure_logging()
        
        logger = get_logger(__name__)
        
        try:
            raise ValueError("test error")
        except ValueError:
            logger.exception("An error occurred")
        
        output = capture_logs.getvalue()
        # Exception logging may produce multiple lines, get the first JSON line
        lines = [line for line in output.strip().split("\n") if line and line.startswith("{")]
        assert len(lines) >= 1
        
        log_entry = json.loads(lines[0])
        
        assert log_entry["event"] == "An error occurred"
        assert "exception" in log_entry
        assert "ValueError" in log_entry["exception"]
        assert "test error" in log_entry["exception"]


class TestTimestamps:
    """Tests for timestamp inclusion."""
    
    def test_timestamp_included(self, capture_logs, monkeypatch):
        """Test that timestamps are included in log entries."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        configure_logging()
        
        logger = get_logger(__name__)
        logger.info("test message")
        
        output = capture_logs.getvalue()
        log_entry = json.loads(output.strip())
        
        assert "timestamp" in log_entry
        # Timestamp should be in ISO format
        assert "T" in log_entry["timestamp"]  # ISO format includes 'T'
