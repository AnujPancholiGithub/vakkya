"""Input validation utilities for voice agent.

This module provides validation functions for all external inputs
to ensure data integrity and security.
"""

import json
from typing import Any

from pydantic import ValidationError

from .models import PageContextInput, ProjectMetadata


# Validation constants
MAX_PAGE_CONTEXT_SIZE_BYTES = 10 * 1024  # 10KB
MAX_DATA_CHANNEL_MESSAGE_SIZE = 10 * 1024  # 10KB


class ValidationException(Exception):
    """Custom exception for validation errors."""

    pass


def validate_page_context_size(data: bytes) -> None:
    """
    Validate that page context data doesn't exceed size limit.
    
    Args:
        data: Raw bytes from data channel
        
    Raises:
        ValidationException: If data exceeds size limit
    """
    if len(data) > MAX_PAGE_CONTEXT_SIZE_BYTES:
        raise ValidationException(
            f"Page context data exceeds maximum size of {MAX_PAGE_CONTEXT_SIZE_BYTES} bytes "
            f"(received {len(data)} bytes)"
        )


def validate_and_parse_page_context(data: bytes) -> PageContextInput:
    """
    Validate and parse page context from data channel message.
    
    This performs comprehensive validation:
    1. Size check (max 10KB)
    2. JSON parsing
    3. Pydantic validation (URL format, SSRF protection)
    
    Args:
        data: Raw bytes from data channel
        
    Returns:
        Validated PageContextInput object
        
    Raises:
        ValidationException: If validation fails at any step
    """
    # Step 1: Validate size
    validate_page_context_size(data)
    
    # Step 2: Parse JSON
    try:
        payload = json.loads(data.decode("utf-8"))
    except json.JSONDecodeError as e:
        raise ValidationException(f"Invalid JSON in page context: {e}")
    except UnicodeDecodeError as e:
        raise ValidationException(f"Invalid UTF-8 encoding in page context: {e}")
    
    # Step 3: Validate with Pydantic
    try:
        return PageContextInput(**payload)
    except ValidationError as e:
        raise ValidationException(f"Invalid page context data: {e}")


def validate_project_metadata(metadata: str | dict[str, Any]) -> ProjectMetadata:
    """
    Validate project metadata from room.
    
    Args:
        metadata: Room metadata (JSON string or dict)
        
    Returns:
        Validated ProjectMetadata object
        
    Raises:
        ValidationException: If validation fails
    """
    # Parse if string
    if isinstance(metadata, str):
        try:
            metadata_dict = json.loads(metadata)
        except json.JSONDecodeError as e:
            raise ValidationException(f"Invalid JSON in project metadata: {e}")
    else:
        metadata_dict = metadata
    
    # Validate with Pydantic
    try:
        return ProjectMetadata(**metadata_dict)
    except ValidationError as e:
        raise ValidationException(f"Invalid project metadata: {e}")


def validate_data_channel_message_size(data: bytes) -> None:
    """
    Validate that data channel message doesn't exceed size limit.
    
    This is a general size check for any data channel message.
    
    Args:
        data: Raw bytes from data channel
        
    Raises:
        ValidationException: If data exceeds size limit
    """
    if len(data) > MAX_DATA_CHANNEL_MESSAGE_SIZE:
        raise ValidationException(
            f"Data channel message exceeds maximum size of {MAX_DATA_CHANNEL_MESSAGE_SIZE} bytes "
            f"(received {len(data)} bytes)"
        )
