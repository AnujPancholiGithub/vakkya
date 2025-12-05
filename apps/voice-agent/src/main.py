"""Main application entry point for LiveKit agent worker.

This module initializes and runs the LiveKit agent worker using the
agents.cli.run_app() function with WorkerOptions. The framework handles
worker lifecycle, room connections, and health checks automatically.

Environment Variables Required:
    LIVEKIT_URL: WebSocket URL for LiveKit server (ws:// or wss://)
    LIVEKIT_API_KEY: API key for LiveKit authentication
    LIVEKIT_API_SECRET: API secret for LiveKit authentication
    DATABASE_URL: PostgreSQL connection string
    OPENAI_API_KEY: OpenAI API key for embeddings and LLM
    API_SERVER_URL: URL for API server (for conversation logging)
    LOG_LEVEL: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    ENVIRONMENT: Environment name (development, production)
"""

import logging
import os

from dotenv import load_dotenv
from livekit.agents import WorkerOptions, cli

from .config import load_config
from .entrypoint import entrypoint
from .logging_config import configure_logging

logger = logging.getLogger(__name__)


def main() -> None:
    """
    Main entry point for the voice agent worker.
    
    This function:
    1. Loads environment variables from .env file
    2. Validates configuration
    3. Configures structured logging
    4. Starts the LiveKit agent worker with WorkerOptions
    
    The framework handles:
    - Worker lifecycle management
    - Room connection management
    - Health check endpoints
    - Graceful shutdown
    
    Exits with code 1 if configuration validation fails.
    """
    # Load .env file into os.environ so spawned processes can access them
    # This is critical for multiprocessing to work correctly
    if not os.getenv("TESTING"):
        load_dotenv()
    
    # Load and validate configuration
    # This will exit with code 1 if any required env vars are missing
    config = load_config()
    
    # Configure structured logging
    configure_logging(log_level=config.log_level)
    
    # Note: Langfuse telemetry is configured per-session in entrypoint.py
    # This allows session-specific metadata (room_name) for trace grouping
    
    logger.info(
        "Starting voice agent worker",
        extra={
            "livekit_url": config.livekit_url,
            "environment": config.environment,
            "log_level": config.log_level,
        },
    )
    
    # Start the worker with our entrypoint function
    # Pass LiveKit credentials to WorkerOptions so they're available in spawned processes
    # The framework handles everything else:
    # - Connects to LiveKit server
    # - Listens for room join events
    # - Calls entrypoint() for each participant
    # - Provides health check endpoints
    # - Handles graceful shutdown
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            ws_url=config.livekit_url,
            api_key=config.livekit_api_key,
            api_secret=config.livekit_api_secret,
        )
    )


if __name__ == "__main__":
    main()
