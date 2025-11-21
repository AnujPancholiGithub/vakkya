"""Tests for input validation utilities."""

import json

import pytest

from src.validation import (
    MAX_DATA_CHANNEL_MESSAGE_SIZE,
    MAX_PAGE_CONTEXT_SIZE_BYTES,
    ValidationException,
    validate_and_parse_page_context,
    validate_data_channel_message_size,
    validate_page_context_size,
    validate_project_metadata,
)


class TestValidatePageContextSize:
    """Tests for validate_page_context_size function."""

    def test_valid_small_data(self):
        """Test that small data passes validation."""
        data = b"small data"
        validate_page_context_size(data)  # Should not raise

    def test_valid_max_size_data(self):
        """Test that data at exactly max size passes."""
        data = b"x" * MAX_PAGE_CONTEXT_SIZE_BYTES
        validate_page_context_size(data)  # Should not raise

    def test_invalid_oversized_data(self):
        """Test that oversized data raises ValidationException."""
        data = b"x" * (MAX_PAGE_CONTEXT_SIZE_BYTES + 1)
        with pytest.raises(ValidationException) as exc_info:
            validate_page_context_size(data)
        assert "exceeds maximum size" in str(exc_info.value)
        assert str(MAX_PAGE_CONTEXT_SIZE_BYTES) in str(exc_info.value)

    def test_empty_data(self):
        """Test that empty data passes validation."""
        data = b""
        validate_page_context_size(data)  # Should not raise


class TestValidateAndParsePageContext:
    """Tests for validate_and_parse_page_context function."""

    def test_valid_page_context(self):
        """Test parsing valid page context."""
        data = json.dumps({"url": "https://example.com/page"}).encode("utf-8")
        result = validate_and_parse_page_context(data)
        assert result.url == "https://example.com/page"

    def test_valid_page_context_with_query_params(self):
        """Test parsing page context with query parameters."""
        data = json.dumps({"url": "https://example.com/page?id=123&ref=home"}).encode("utf-8")
        result = validate_and_parse_page_context(data)
        assert "id=123" in result.url

    def test_invalid_oversized_data(self):
        """Test that oversized data raises ValidationException."""
        large_url = "https://example.com/" + "a" * (MAX_PAGE_CONTEXT_SIZE_BYTES + 100)
        data = json.dumps({"url": large_url}).encode("utf-8")
        with pytest.raises(ValidationException) as exc_info:
            validate_and_parse_page_context(data)
        assert "exceeds maximum size" in str(exc_info.value)

    def test_invalid_json(self):
        """Test that invalid JSON raises ValidationException."""
        data = b"not valid json"
        with pytest.raises(ValidationException) as exc_info:
            validate_and_parse_page_context(data)
        assert "Invalid JSON" in str(exc_info.value)

    def test_invalid_utf8(self):
        """Test that invalid UTF-8 raises ValidationException."""
        data = b"\xff\xfe invalid utf-8"
        with pytest.raises(ValidationException) as exc_info:
            validate_and_parse_page_context(data)
        assert "Invalid UTF-8" in str(exc_info.value) or "Invalid JSON" in str(exc_info.value)

    def test_missing_url_field(self):
        """Test that missing URL field raises ValidationException."""
        data = json.dumps({"not_url": "value"}).encode("utf-8")
        with pytest.raises(ValidationException) as exc_info:
            validate_and_parse_page_context(data)
        assert "Invalid page context data" in str(exc_info.value)

    def test_invalid_url_format(self):
        """Test that invalid URL format raises ValidationException."""
        data = json.dumps({"url": "not-a-valid-url"}).encode("utf-8")
        with pytest.raises(ValidationException) as exc_info:
            validate_and_parse_page_context(data)
        assert "Invalid page context data" in str(exc_info.value)

    def test_localhost_url_blocked(self):
        """Test that localhost URLs are blocked (SSRF protection)."""
        data = json.dumps({"url": "http://localhost:3000/admin"}).encode("utf-8")
        with pytest.raises(ValidationException) as exc_info:
            validate_and_parse_page_context(data)
        assert "Invalid page context data" in str(exc_info.value)

    def test_empty_url(self):
        """Test that empty URL raises ValidationException."""
        data = json.dumps({"url": ""}).encode("utf-8")
        with pytest.raises(ValidationException) as exc_info:
            validate_and_parse_page_context(data)
        assert "Invalid page context data" in str(exc_info.value)


class TestValidateProjectMetadata:
    """Tests for validate_project_metadata function."""

    def test_valid_project_metadata_dict(self):
        """Test parsing valid project metadata from dict."""
        metadata = {"project_id": "123e4567-e89b-12d3-a456-426614174000"}
        result = validate_project_metadata(metadata)
        assert result.project_id == "123e4567-e89b-12d3-a456-426614174000"

    def test_valid_project_metadata_string(self):
        """Test parsing valid project metadata from JSON string."""
        metadata = json.dumps({"project_id": "123e4567-e89b-12d3-a456-426614174000"})
        result = validate_project_metadata(metadata)
        assert result.project_id == "123e4567-e89b-12d3-a456-426614174000"

    def test_valid_uppercase_uuid(self):
        """Test that uppercase UUIDs are accepted."""
        metadata = {"project_id": "123E4567-E89B-12D3-A456-426614174000"}
        result = validate_project_metadata(metadata)
        assert result.project_id == "123E4567-E89B-12D3-A456-426614174000"

    def test_invalid_json_string(self):
        """Test that invalid JSON string raises ValidationException."""
        metadata = "not valid json"
        with pytest.raises(ValidationException) as exc_info:
            validate_project_metadata(metadata)
        assert "Invalid JSON" in str(exc_info.value)

    def test_missing_project_id_field(self):
        """Test that missing project_id field raises ValidationException."""
        metadata = {"not_project_id": "value"}
        with pytest.raises(ValidationException) as exc_info:
            validate_project_metadata(metadata)
        assert "Invalid project metadata" in str(exc_info.value)

    def test_invalid_uuid_format(self):
        """Test that invalid UUID format raises ValidationException."""
        metadata = {"project_id": "not-a-uuid"}
        with pytest.raises(ValidationException) as exc_info:
            validate_project_metadata(metadata)
        assert "Invalid project metadata" in str(exc_info.value)

    def test_empty_project_id(self):
        """Test that empty project_id raises ValidationException."""
        metadata = {"project_id": ""}
        with pytest.raises(ValidationException) as exc_info:
            validate_project_metadata(metadata)
        assert "Invalid project metadata" in str(exc_info.value)


class TestValidateDataChannelMessageSize:
    """Tests for validate_data_channel_message_size function."""

    def test_valid_small_message(self):
        """Test that small messages pass validation."""
        data = b"small message"
        validate_data_channel_message_size(data)  # Should not raise

    def test_valid_max_size_message(self):
        """Test that messages at exactly max size pass."""
        data = b"x" * MAX_DATA_CHANNEL_MESSAGE_SIZE
        validate_data_channel_message_size(data)  # Should not raise

    def test_invalid_oversized_message(self):
        """Test that oversized messages raise ValidationException."""
        data = b"x" * (MAX_DATA_CHANNEL_MESSAGE_SIZE + 1)
        with pytest.raises(ValidationException) as exc_info:
            validate_data_channel_message_size(data)
        assert "exceeds maximum size" in str(exc_info.value)
        assert str(MAX_DATA_CHANNEL_MESSAGE_SIZE) in str(exc_info.value)

    def test_empty_message(self):
        """Test that empty messages pass validation."""
        data = b""
        validate_data_channel_message_size(data)  # Should not raise


class TestValidationConstants:
    """Tests for validation constants."""

    def test_page_context_size_limit(self):
        """Test that page context size limit is 10KB."""
        assert MAX_PAGE_CONTEXT_SIZE_BYTES == 10 * 1024

    def test_data_channel_message_size_limit(self):
        """Test that data channel message size limit is 10KB."""
        assert MAX_DATA_CHANNEL_MESSAGE_SIZE == 10 * 1024


class TestValidationExceptionMessage:
    """Tests for ValidationException error messages."""

    def test_exception_message_includes_details(self):
        """Test that ValidationException includes helpful details."""
        data = b"x" * (MAX_PAGE_CONTEXT_SIZE_BYTES + 100)
        with pytest.raises(ValidationException) as exc_info:
            validate_page_context_size(data)
        
        error_msg = str(exc_info.value)
        # Should include both the limit and actual size
        assert str(MAX_PAGE_CONTEXT_SIZE_BYTES) in error_msg
        assert str(len(data)) in error_msg
