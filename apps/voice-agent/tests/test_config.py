"""Tests for configuration and environment validation."""

import os

import pytest

from src.config import Config, get_config, load_config


@pytest.fixture(autouse=True)
def testing_mode(monkeypatch):
    """Enable testing mode to disable .env file loading."""
    monkeypatch.setenv("TESTING", "1")


@pytest.fixture
def valid_env(monkeypatch):
    """Set up valid environment variables for testing."""
    monkeypatch.setenv("LIVEKIT_URL", "wss://test.livekit.cloud")
    monkeypatch.setenv("LIVEKIT_API_KEY", "test_api_key")
    monkeypatch.setenv("LIVEKIT_API_SECRET", "test_api_secret")
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/test")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test123")
    monkeypatch.setenv("API_SERVER_URL", "http://localhost:3000")
    monkeypatch.setenv("LOG_LEVEL", "INFO")
    monkeypatch.setenv("ENVIRONMENT", "development")


@pytest.fixture
def minimal_env(monkeypatch):
    """Set up minimal required environment variables."""
    # Clear all environment variables first
    for key in list(os.environ.keys()):
        if key.startswith(("LIVEKIT_", "DATABASE_", "OPENAI_", "API_SERVER_", "LOG_", "ENVIRONMENT")):
            monkeypatch.delenv(key, raising=False)
    
    monkeypatch.setenv("LIVEKIT_URL", "wss://test.livekit.cloud")
    monkeypatch.setenv("LIVEKIT_API_KEY", "test_key")
    monkeypatch.setenv("LIVEKIT_API_SECRET", "test_secret")
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/test")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    # Don't set LOG_LEVEL or ENVIRONMENT to test defaults


class TestConfigValidation:
    """Tests for Config model validation."""
    
    def test_valid_config(self, valid_env):
        """Test that valid configuration loads successfully."""
        config = Config()
        
        assert config.livekit_url == "wss://test.livekit.cloud"
        assert config.livekit_api_key == "test_api_key"
        assert config.livekit_api_secret == "test_api_secret"
        assert config.database_url == "postgresql://user:pass@localhost:5432/test"
        assert config.openai_api_key == "sk-test123"
        assert config.api_server_url == "http://localhost:3000"
        assert config.log_level == "INFO"
        assert config.environment == "development"
    
    def test_minimal_config_with_defaults(self, minimal_env):
        """Test that minimal config uses default values."""
        config = Config()
        
        assert config.livekit_url == "wss://test.livekit.cloud"
        assert config.api_server_url == "http://localhost:3000"  # Default
        assert config.log_level == "INFO"  # Default (normalized to uppercase)
        assert config.environment == "production"  # Default (normalized to lowercase)
    
    def test_missing_livekit_url(self, monkeypatch):
        """Test that missing LIVEKIT_URL raises validation error."""
        # Clear all env vars
        for key in list(os.environ.keys()):
            if key.startswith(("LIVEKIT_", "DATABASE_", "OPENAI_")):
                monkeypatch.delenv(key, raising=False)
        
        # Set only some required vars, missing LIVEKIT_URL
        monkeypatch.setenv("LIVEKIT_API_KEY", "test")
        monkeypatch.setenv("LIVEKIT_API_SECRET", "test")
        monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/test")
        monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
        
        with pytest.raises(Exception):  # Pydantic ValidationError
            Config()
    
    def test_missing_livekit_api_key(self, monkeypatch):
        """Test that missing LIVEKIT_API_KEY raises validation error."""
        # Clear all env vars
        for key in list(os.environ.keys()):
            if key.startswith(("LIVEKIT_", "DATABASE_", "OPENAI_")):
                monkeypatch.delenv(key, raising=False)
        
        monkeypatch.setenv("LIVEKIT_URL", "wss://test.livekit.cloud")
        monkeypatch.setenv("LIVEKIT_API_SECRET", "test")
        monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/test")
        monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
        
        with pytest.raises(Exception):
            Config()
    
    def test_missing_livekit_api_secret(self, monkeypatch):
        """Test that missing LIVEKIT_API_SECRET raises validation error."""
        # Clear all env vars
        for key in list(os.environ.keys()):
            if key.startswith(("LIVEKIT_", "DATABASE_", "OPENAI_")):
                monkeypatch.delenv(key, raising=False)
        
        monkeypatch.setenv("LIVEKIT_URL", "wss://test.livekit.cloud")
        monkeypatch.setenv("LIVEKIT_API_KEY", "test")
        monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/test")
        monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
        
        with pytest.raises(Exception):
            Config()
    
    def test_missing_database_url(self, monkeypatch):
        """Test that missing DATABASE_URL raises validation error."""
        # Clear all env vars
        for key in list(os.environ.keys()):
            if key.startswith(("LIVEKIT_", "DATABASE_", "OPENAI_")):
                monkeypatch.delenv(key, raising=False)
        
        monkeypatch.setenv("LIVEKIT_URL", "wss://test.livekit.cloud")
        monkeypatch.setenv("LIVEKIT_API_KEY", "test")
        monkeypatch.setenv("LIVEKIT_API_SECRET", "test")
        monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
        
        with pytest.raises(Exception):
            Config()
    
    def test_missing_openai_api_key(self, valid_env, monkeypatch):
        """Test that missing OPENAI_API_KEY raises validation error."""
        monkeypatch.delenv("OPENAI_API_KEY")
        
        with pytest.raises(Exception):
            Config()
    
    def test_invalid_livekit_url_format(self, valid_env, monkeypatch):
        """Test that invalid LIVEKIT_URL format raises validation error."""
        monkeypatch.setenv("LIVEKIT_URL", "http://invalid.com")
        
        with pytest.raises(Exception) as exc_info:
            Config()
        assert "must start with ws:// or wss://" in str(exc_info.value)
    
    def test_invalid_database_url_format(self, valid_env, monkeypatch):
        """Test that invalid DATABASE_URL format raises validation error."""
        monkeypatch.setenv("DATABASE_URL", "mysql://localhost/test")
        
        with pytest.raises(Exception) as exc_info:
            Config()
        assert "must start with postgresql://" in str(exc_info.value)
    
    def test_invalid_api_server_url_format(self, valid_env, monkeypatch):
        """Test that invalid API_SERVER_URL format raises validation error."""
        monkeypatch.setenv("API_SERVER_URL", "ftp://invalid.com")
        
        with pytest.raises(Exception) as exc_info:
            Config()
        assert "must start with http:// or https://" in str(exc_info.value)
    
    def test_empty_livekit_url(self, valid_env, monkeypatch):
        """Test that empty LIVEKIT_URL raises validation error."""
        monkeypatch.setenv("LIVEKIT_URL", "")
        
        with pytest.raises(Exception):
            Config()
    
    def test_case_insensitive_env_vars(self, monkeypatch):
        """Test that environment variables are case-insensitive."""
        monkeypatch.setenv("livekit_url", "wss://test.livekit.cloud")
        monkeypatch.setenv("LIVEKIT_API_KEY", "test_key")
        monkeypatch.setenv("livekit_api_secret", "test_secret")
        monkeypatch.setenv("database_url", "postgresql://localhost/test")
        monkeypatch.setenv("openai_api_key", "sk-test")
        
        config = Config()
        assert config.livekit_url == "wss://test.livekit.cloud"


class TestLogLevel:
    """Tests for log level validation."""
    
    def test_valid_log_levels(self, minimal_env, monkeypatch):
        """Test that all valid log levels are accepted."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        
        for level in valid_levels:
            monkeypatch.setenv("LOG_LEVEL", level)
            config = Config()
            assert config.log_level == level
    
    def test_invalid_log_level(self, minimal_env, monkeypatch):
        """Test that invalid log level raises validation error."""
        monkeypatch.setenv("LOG_LEVEL", "INVALID")
        
        with pytest.raises(Exception):
            Config()
    
    def test_lowercase_log_level(self, minimal_env, monkeypatch):
        """Test that lowercase log level is converted to uppercase."""
        monkeypatch.setenv("LOG_LEVEL", "info")
        config = Config()
        assert config.log_level == "INFO"  # Normalized to uppercase


class TestEnvironment:
    """Tests for environment validation."""
    
    def test_development_environment(self, minimal_env, monkeypatch):
        """Test development environment setting."""
        monkeypatch.setenv("ENVIRONMENT", "development")
        config = Config()
        assert config.environment == "development"  # Normalized to lowercase
    
    def test_production_environment(self, minimal_env, monkeypatch):
        """Test production environment setting."""
        monkeypatch.setenv("ENVIRONMENT", "production")
        config = Config()
        assert config.environment == "production"
    
    def test_invalid_environment(self, minimal_env, monkeypatch):
        """Test that invalid environment raises validation error."""
        monkeypatch.setenv("ENVIRONMENT", "staging")
        
        with pytest.raises(Exception):
            Config()


class TestLoadConfig:
    """Tests for load_config function."""
    
    def test_load_config_success(self, valid_env):
        """Test that load_config returns valid Config object."""
        config = load_config()
        
        assert isinstance(config, Config)
        assert config.livekit_url == "wss://test.livekit.cloud"
    
    def test_load_config_missing_required_var(self, monkeypatch):
        """Test that load_config exits on missing required variable."""
        # Clear all env vars
        for key in list(os.environ.keys()):
            if key.startswith(("LIVEKIT_", "DATABASE_", "OPENAI_")):
                monkeypatch.delenv(key, raising=False)
        
        # Set only some vars, missing LIVEKIT_URL
        monkeypatch.setenv("LIVEKIT_API_KEY", "test")
        monkeypatch.setenv("LIVEKIT_API_SECRET", "test")
        monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/test")
        monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
        
        with pytest.raises(SystemExit) as exc_info:
            load_config()
        assert exc_info.value.code == 1
    
    def test_load_config_invalid_format(self, valid_env, monkeypatch):
        """Test that load_config exits on invalid format."""
        monkeypatch.setenv("LIVEKIT_URL", "http://invalid")
        
        with pytest.raises(SystemExit) as exc_info:
            load_config()
        assert exc_info.value.code == 1


class TestGetConfig:
    """Tests for get_config singleton function."""
    
    def test_get_config_returns_config(self, valid_env):
        """Test that get_config returns Config object."""
        # Reset singleton
        import src.config
        src.config._config = None
        
        config = get_config()
        assert isinstance(config, Config)
    
    def test_get_config_singleton(self, valid_env):
        """Test that get_config returns same instance on multiple calls."""
        # Reset singleton
        import src.config
        src.config._config = None
        
        config1 = get_config()
        config2 = get_config()
        
        assert config1 is config2


class TestURLValidation:
    """Tests for URL format validation."""
    
    def test_ws_protocol_accepted(self, minimal_env, monkeypatch):
        """Test that ws:// protocol is accepted for LiveKit URL."""
        monkeypatch.setenv("LIVEKIT_URL", "ws://localhost:7880")
        config = Config()
        assert config.livekit_url == "ws://localhost:7880"
    
    def test_wss_protocol_accepted(self, minimal_env, monkeypatch):
        """Test that wss:// protocol is accepted for LiveKit URL."""
        monkeypatch.setenv("LIVEKIT_URL", "wss://test.livekit.cloud")
        config = Config()
        assert config.livekit_url == "wss://test.livekit.cloud"
    
    def test_http_api_server_url(self, minimal_env, monkeypatch):
        """Test that http:// is accepted for API server URL."""
        monkeypatch.setenv("API_SERVER_URL", "http://localhost:3000")
        config = Config()
        assert config.api_server_url == "http://localhost:3000"
    
    def test_https_api_server_url(self, minimal_env, monkeypatch):
        """Test that https:// is accepted for API server URL."""
        monkeypatch.setenv("API_SERVER_URL", "https://api.example.com")
        config = Config()
        assert config.api_server_url == "https://api.example.com"
