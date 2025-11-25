"""Configuration and environment variable validation.

This module validates all required environment variables on startup
and provides a centralized configuration object.
"""

import os
import sys
from pydantic import Field, ValidationError, field_validator
from pydantic_settings import BaseSettings


class Config(BaseSettings):
    """
    Application configuration with environment variable validation.
    
    All required environment variables are validated on startup.
    Missing or invalid variables will cause the application to fail fast
    with clear error messages.
    """
    
    # LiveKit Configuration (required)
    livekit_url: str = Field(..., min_length=1, description="LiveKit server URL")
    livekit_api_key: str = Field(..., min_length=1, description="LiveKit API key")
    livekit_api_secret: str = Field(..., min_length=1, description="LiveKit API secret")
    
    # Database Configuration (required)
    database_url: str = Field(..., min_length=1, description="PostgreSQL connection URL")
    
    # OpenAI Configuration (optional - only needed for RAG embeddings in Phase 4)
    openai_api_key: str | None = Field(default=None, description="OpenAI API key for embeddings (optional until RAG is implemented)")
    openai_base_url: str | None = Field(default=None, description="OpenAI base URL for OpenRouter support")
    
    # API Server Configuration (required for conversation logging)
    api_server_url: str = Field(
        default="http://localhost:3000",
        min_length=1,
        description="API server base URL for conversation logging"
    )
    
    # Application Configuration (optional with defaults)
    log_level: str = Field(
        default="INFO",
        description="Logging level"
    )
    environment: str = Field(
        default="production",
        description="Application environment"
    )
    
    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate and normalize log level."""
        v_upper = v.upper()
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v_upper not in valid_levels:
            raise ValueError(f"LOG_LEVEL must be one of: {', '.join(valid_levels)}")
        return v_upper
    
    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate and normalize environment."""
        v_lower = v.lower()
        valid_envs = ["development", "production"]
        if v_lower not in valid_envs:
            raise ValueError(f"ENVIRONMENT must be one of: {', '.join(valid_envs)}")
        return v_lower
    
    @field_validator("livekit_url")
    @classmethod
    def validate_livekit_url(cls, v: str) -> str:
        """Validate LiveKit URL format."""
        if not v.startswith(("ws://", "wss://")):
            raise ValueError("LIVEKIT_URL must start with ws:// or wss://")
        return v
    
    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Validate database URL format."""
        if not v.startswith("postgresql://"):
            raise ValueError("DATABASE_URL must start with postgresql://")
        return v
    
    @field_validator("api_server_url")
    @classmethod
    def validate_api_server_url(cls, v: str) -> str:
        """Validate API server URL format."""
        if not v.startswith(("http://", "https://")):
            raise ValueError("API_SERVER_URL must start with http:// or https://")
        return v
    
    model_config = {
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }
    
    def __init__(self, **kwargs):
        # Only load .env file if not in testing mode
        if not os.getenv("TESTING"):
            kwargs.setdefault("_env_file", ".env")
        super().__init__(**kwargs)


def load_config() -> Config:
    """
    Load and validate configuration from environment variables.
    
    This function should be called at application startup.
    It will fail fast with clear error messages if any required
    environment variables are missing or invalid.
    
    Returns:
        Validated Config object
        
    Raises:
        SystemExit: If configuration validation fails
    """
    try:
        config = Config()
        return config
    except ValidationError as e:
        # Format validation errors for clear output
        print("=" * 70, file=sys.stderr)
        print("CONFIGURATION ERROR: Invalid or missing environment variables", file=sys.stderr)
        print("=" * 70, file=sys.stderr)
        
        for error in e.errors():
            field = error["loc"][0] if error["loc"] else "unknown"
            message = error["msg"]
            error_type = error["type"]
            
            # Convert field name to environment variable name
            env_var = field.upper()
            
            print(f"\n❌ {env_var}:", file=sys.stderr)
            print(f"   Error: {message}", file=sys.stderr)
            print(f"   Type: {error_type}", file=sys.stderr)
        
        print("\n" + "=" * 70, file=sys.stderr)
        print("Please check your .env file or environment variables.", file=sys.stderr)
        print("See .env.example for required configuration.", file=sys.stderr)
        print("=" * 70, file=sys.stderr)
        
        sys.exit(1)
    except Exception as e:
        print("=" * 70, file=sys.stderr)
        print(f"CONFIGURATION ERROR: {e}", file=sys.stderr)
        print("=" * 70, file=sys.stderr)
        sys.exit(1)


def validate_environment() -> None:
    """
    Validate environment variables without loading full config.
    
    This is a convenience function that can be used for quick validation
    checks. For full configuration loading, use load_config().
    
    Raises:
        SystemExit: If validation fails
    """
    load_config()


# Singleton config instance (loaded on first import)
_config: Config | None = None


def get_config() -> Config:
    """
    Get the singleton configuration instance.
    
    The configuration is loaded once on first call and cached.
    
    Returns:
        Config object
    """
    global _config
    if _config is None:
        _config = load_config()
    return _config
