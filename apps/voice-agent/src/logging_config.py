"""Structured logging configuration for voice agent.

This module configures structlog to work with Python's standard logging library.
It provides structured JSON logging with context enrichment for production
and human-readable output for development.

Key Features:
- Structured JSON logging in production
- Pretty-printed logs in development
- Automatic context enrichment (session_id, project_id)
- Log level configuration via environment
- Integration with standard library logging
"""

import logging
import os
import sys
from typing import Any

import structlog


def configure_logging(log_level: str = "INFO") -> None:
    """
    Configure structured logging for the voice agent.
    
    This sets up both structlog and standard library logging to work together.
    In production, logs are output as JSON. In development, logs are pretty-printed.
    
    Args:
        log_level: Log level string (DEBUG, INFO, WARNING, ERROR, CRITICAL)
                  Defaults to INFO. Can be overridden with LOG_LEVEL env var.
    
    Environment Variables:
        LOG_LEVEL: Override the log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        ENVIRONMENT: Set to "development" for pretty-printed logs, anything else for JSON
    """
    # Allow environment variable to override log level
    log_level = os.getenv("LOG_LEVEL", log_level).upper()
    environment = os.getenv("ENVIRONMENT", "production").lower()
    
    # Convert string log level to logging constant
    numeric_level = getattr(logging, log_level, logging.INFO)
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=numeric_level,
    )
    
    # Determine if we're in development mode
    is_development = environment == "development"
    
    # Configure structlog processors
    processors = [
        # Merge in context variables
        structlog.contextvars.merge_contextvars,
        # Add log level to event dict
        structlog.stdlib.add_log_level,
        # Filter by log level
        structlog.stdlib.filter_by_level,
        # Add logger name to event dict
        structlog.stdlib.add_logger_name,
        # Add timestamp
        structlog.processors.TimeStamper(fmt="iso"),
        # Add stack info if available
        structlog.processors.StackInfoRenderer(),
        # Format exceptions
        structlog.processors.format_exc_info,
        # Decode unicode
        structlog.processors.UnicodeDecoder(),
    ]
    
    # Add appropriate renderer based on environment
    if is_development:
        # Pretty-printed colored output for development
        processors.append(
            structlog.dev.ConsoleRenderer(
                colors=True,
                exception_formatter=structlog.dev.plain_traceback,
            )
        )
    else:
        # JSON output for production
        processors.append(
            structlog.processors.JSONRenderer()
        )
    
    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str, **initial_context: Any) -> structlog.stdlib.BoundLogger:
    """
    Get a configured logger with optional initial context.
    
    This is a convenience function that returns a structlog logger
    with any initial context bound to it.
    
    Args:
        name: Logger name (typically __name__)
        **initial_context: Initial context to bind to the logger
                          (e.g., session_id="abc", project_id="xyz")
    
    Returns:
        Configured structlog logger with bound context
    
    Example:
        >>> logger = get_logger(__name__, session_id="abc123")
        >>> logger.info("Session started", project_id="proj_456")
    """
    logger = structlog.get_logger(name)
    if initial_context:
        logger = logger.bind(**initial_context)
    return logger


def bind_context(**context: Any) -> None:
    """
    Bind context to the current thread/task.
    
    This adds context that will be included in all subsequent log messages
    within the current execution context.
    
    Args:
        **context: Context key-value pairs to bind
                  (e.g., session_id="abc", project_id="xyz")
    
    Example:
        >>> bind_context(session_id="abc123", project_id="proj_456")
        >>> logger.info("Processing request")  # Will include session_id and project_id
    """
    structlog.contextvars.bind_contextvars(**context)


def unbind_context(*keys: str) -> None:
    """
    Remove specific keys from the current context.
    
    Args:
        *keys: Context keys to remove
    
    Example:
        >>> unbind_context("session_id", "project_id")
    """
    structlog.contextvars.unbind_contextvars(*keys)


def clear_context() -> None:
    """
    Clear all context from the current thread/task.
    
    This is useful at the start of a new request/session to ensure
    no stale context leaks between sessions.
    
    Example:
        >>> clear_context()
        >>> bind_context(session_id="new_session")
    """
    structlog.contextvars.clear_contextvars()
