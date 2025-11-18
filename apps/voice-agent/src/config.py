"""Configuration management with environment variable validation."""

import os
import sys
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with validation."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # LiveKit Configuration
    livekit_url: str = Field(..., description="LiveKit server URL")
    livekit_api_key: str = Field(..., description="LiveKit API key")
    livekit_api_secret: str = Field(..., description="LiveKit API secret")

    # OpenAI Configuration
    openai_api_key: str = Field(..., description="OpenAI API key")

    # Database Configuration
    database_url: str = Field(..., description="PostgreSQL connection URL")

    # Application Configuration
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO", description="Logging level"
    )
    environment: Literal["development", "production", "test"] = Field(
        default="development", description="Environment name"
    )

    # API Server Configuration
    api_server_url: str = Field(
        default="http://localhost:3000", description="API server base URL"
    )

    @field_validator("livekit_url")
    @classmethod
    def validate_livekit_url(cls, v: str) -> str:
        """Validate LiveKit URL format."""
        if not v.startswith(("ws://", "wss://")):
            raise ValueError("LiveKit URL must start with ws:// or wss://")
        return v

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Validate database URL format."""
        if not v.startswith("postgresql://"):
            raise ValueError("Database URL must start with postgresql://")
        return v


def load_settings() -> Settings:
    """Load and validate settings, exit on failure."""
    try:
        settings = Settings()
        return settings
    except Exception as e:
        print(f"❌ Configuration error: {e}", file=sys.stderr)
        sys.exit(1)


# Global settings instance - only load if not in test mode
_settings: Settings | None = None


def get_settings() -> Settings:
    """Get or create settings instance."""
    global _settings
    if _settings is None:
        _settings = load_settings()
    return _settings
