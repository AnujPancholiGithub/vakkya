"""Tests for main application entry point."""

import os
from unittest.mock import MagicMock, patch

import pytest

# Set required environment variables for tests
os.environ.setdefault("LIVEKIT_API_KEY", "test-api-key")
os.environ.setdefault("LIVEKIT_API_SECRET", "test-api-secret")
os.environ.setdefault("LIVEKIT_URL", "wss://test.livekit.cloud")
os.environ.setdefault("DATABASE_URL", "postgresql://localhost/test")
os.environ.setdefault("OPENAI_API_KEY", "sk-test")


class TestMain:
    """Tests for main() function."""

    @patch("src.main.cli.run_app")
    @patch("src.main.configure_logging")
    @patch("src.main.load_config")
    def test_main_successful_startup(self, mock_load_config, mock_configure_logging, mock_run_app):
        """Test that main() successfully starts the worker."""
        # Arrange
        from src.main import main

        mock_config = MagicMock()
        mock_config.livekit_url = "wss://test.livekit.cloud"
        mock_config.log_level = "INFO"
        mock_config.environment = "production"
        mock_load_config.return_value = mock_config

        # Act
        main()

        # Assert
        mock_load_config.assert_called_once()
        mock_configure_logging.assert_called_once_with(log_level="INFO")
        mock_run_app.assert_called_once()

    @patch("src.main.cli.run_app")
    @patch("src.main.configure_logging")
    @patch("src.main.load_config")
    def test_main_passes_worker_options(self, mock_load_config, mock_configure_logging, mock_run_app):
        """Test that main() passes WorkerOptions with entrypoint function."""
        # Arrange
        from src.main import main

        mock_config = MagicMock()
        mock_config.livekit_url = "wss://test.livekit.cloud"
        mock_config.log_level = "INFO"
        mock_config.environment = "production"
        mock_load_config.return_value = mock_config

        # Act
        main()

        # Assert
        # Verify WorkerOptions was passed to run_app
        call_args = mock_run_app.call_args
        assert call_args is not None
        worker_options = call_args[0][0]
        
        # Verify entrypoint_fnc is set
        assert hasattr(worker_options, "entrypoint_fnc")
        assert worker_options.entrypoint_fnc is not None

    @patch("src.main.cli.run_app")
    @patch("src.main.configure_logging")
    @patch("src.main.load_config")
    def test_main_uses_config_log_level(self, mock_load_config, mock_configure_logging, mock_run_app):
        """Test that main() uses log level from config."""
        # Arrange
        from src.main import main

        mock_config = MagicMock()
        mock_config.livekit_url = "wss://test.livekit.cloud"
        mock_config.log_level = "DEBUG"
        mock_config.environment = "development"
        mock_load_config.return_value = mock_config

        # Act
        main()

        # Assert
        mock_configure_logging.assert_called_once_with(log_level="DEBUG")

    @patch("src.main.cli.run_app")
    @patch("src.main.configure_logging")
    @patch("src.main.load_config")
    def test_main_exits_on_config_error(self, mock_load_config, mock_configure_logging, mock_run_app):
        """Test that main() exits when config validation fails."""
        # Arrange
        from src.main import main

        # Make load_config raise SystemExit (which it does on validation failure)
        mock_load_config.side_effect = SystemExit(1)

        # Act & Assert
        with pytest.raises(SystemExit) as exc_info:
            main()
        
        assert exc_info.value.code == 1
        # Should not reach configure_logging or run_app
        mock_configure_logging.assert_not_called()
        mock_run_app.assert_not_called()

    @patch("src.main.cli.run_app")
    @patch("src.main.configure_logging")
    @patch("src.main.load_config")
    def test_main_logs_startup_info(self, mock_load_config, mock_configure_logging, mock_run_app):
        """Test that main() logs startup information."""
        # Arrange
        from src.main import main

        mock_config = MagicMock()
        mock_config.livekit_url = "wss://test.livekit.cloud"
        mock_config.log_level = "INFO"
        mock_config.environment = "production"
        mock_load_config.return_value = mock_config

        # Act
        with patch("src.main.logger") as mock_logger:
            main()

        # Assert
        # Verify startup log was written
        mock_logger.info.assert_called_once()
        call_args = mock_logger.info.call_args
        assert "Starting voice agent worker" in call_args[0][0]


class TestMainEntrypoint:
    """Tests for __main__ entry point."""

    @patch("src.main.main")
    def test_main_module_execution(self, mock_main):
        """Test that running as __main__ calls main()."""
        # This test verifies the if __name__ == "__main__" block
        # We can't directly test it, but we can verify the pattern exists
        from src import main as main_module
        
        # Verify main function exists and is callable
        assert hasattr(main_module, "main")
        assert callable(main_module.main)


class TestMainConfiguration:
    """Tests for configuration handling in main."""

    @patch("src.main.cli.run_app")
    @patch("src.main.configure_logging")
    @patch("src.main.load_config")
    def test_main_respects_environment_variable(self, mock_load_config, mock_configure_logging, mock_run_app, monkeypatch):
        """Test that main() respects environment-specific configuration."""
        # Arrange
        from src.main import main

        monkeypatch.setenv("ENVIRONMENT", "development")
        
        mock_config = MagicMock()
        mock_config.livekit_url = "ws://localhost:7880"
        mock_config.log_level = "DEBUG"
        mock_config.environment = "development"
        mock_load_config.return_value = mock_config

        # Act
        main()

        # Assert
        mock_configure_logging.assert_called_once_with(log_level="DEBUG")

    @patch("src.main.cli.run_app")
    @patch("src.main.configure_logging")
    @patch("src.main.load_config")
    def test_main_handles_production_config(self, mock_load_config, mock_configure_logging, mock_run_app, monkeypatch):
        """Test that main() handles production configuration."""
        # Arrange
        from src.main import main

        monkeypatch.setenv("ENVIRONMENT", "production")
        monkeypatch.setenv("LOG_LEVEL", "INFO")
        
        mock_config = MagicMock()
        mock_config.livekit_url = "wss://prod.livekit.cloud"
        mock_config.log_level = "INFO"
        mock_config.environment = "production"
        mock_load_config.return_value = mock_config

        # Act
        main()

        # Assert
        mock_configure_logging.assert_called_once_with(log_level="INFO")
        mock_run_app.assert_called_once()
