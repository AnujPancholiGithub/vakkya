"""Tests for configuration management."""

import os
from unittest.mock import patch

import pytest
from pydantic import ValidationError

from src.config import Settings


class TestSettings:
    """Test Settings validation."""

    def test_valid_settings(self):
        """Test that valid settings are accepted."""
        settings = Settings(
            livekit_url="wss://test.livekit.cloud",
            livekit_api_key="test_key",
            livekit_api_secret="test_secret",
            openai_api_key="sk-test",
            database_url="postgresql://user:pass@localhost:5432/db",
        )
        assert settings.livekit_url == "wss://test.livekit.cloud"
        assert settings.log_level == "INFO"
        assert settings.environment == "development"

    def test_invalid_livekit_url(self):
        """Test that invalid LiveKit URL is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            Settings(
                livekit_url="https://test.livekit.cloud",  # Should be wss://
                livekit_api_key="test_key",
                livekit_api_secret="test_secret",
                openai_api_key="sk-test",
                database_url="postgresql://user:pass@localhost:5432/db",
            )
        assert "LiveKit URL must start with ws:// or wss://" in str(exc_info.value)

    def test_invalid_database_url(self):
        """Test that invalid database URL is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            Settings(
                livekit_url="wss://test.livekit.cloud",
                livekit_api_key="test_key",
                livekit_api_secret="test_secret",
                openai_api_key="sk-test",
                database_url="mysql://user:pass@localhost:5432/db",  # Should be postgresql://
            )
        assert "Database URL must start with postgresql://" in str(exc_info.value)

    def test_missing_required_field(self):
        """Test that missing required fields are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            Settings(
                livekit_url="wss://test.livekit.cloud",
                livekit_api_key="test_key",
                # Missing livekit_api_secret
                openai_api_key="sk-test",
                database_url="postgresql://user:pass@localhost:5432/db",
            )
        assert "livekit_api_secret" in str(exc_info.value)

    def test_default_values(self):
        """Test that default values are set correctly."""
        settings = Settings(
            livekit_url="wss://test.livekit.cloud",
            livekit_api_key="test_key",
            livekit_api_secret="test_secret",
            openai_api_key="sk-test",
            database_url="postgresql://user:pass@localhost:5432/db",
        )
        assert settings.log_level == "INFO"
        assert settings.environment == "development"
        assert settings.api_server_url == "http://localhost:3000"

    def test_custom_log_level(self):
        """Test that custom log level is accepted."""
        settings = Settings(
            livekit_url="wss://test.livekit.cloud",
            livekit_api_key="test_key",
            livekit_api_secret="test_secret",
            openai_api_key="sk-test",
            database_url="postgresql://user:pass@localhost:5432/db",
            log_level="DEBUG",
        )
        assert settings.log_level == "DEBUG"

    def test_invalid_log_level(self):
        """Test that invalid log level is rejected."""
        with pytest.raises(ValidationError):
            Settings(
                livekit_url="wss://test.livekit.cloud",
                livekit_api_key="test_key",
                livekit_api_secret="test_secret",
                openai_api_key="sk-test",
                database_url="postgresql://user:pass@localhost:5432/db",
                log_level="INVALID",
            )
