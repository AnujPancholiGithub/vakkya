"""Utility modules for voice agent."""

import json
import logging
from typing import Any
from urllib.parse import urlparse

from livekit import rtc

logger = logging.getLogger(__name__)


def sanitize_url_for_logging(url: str) -> str:
    """Remove query params and fragments from URL for safe logging.
    
    Prevents accidental logging of tokens or sensitive data in URLs.
    
    Args:
        url: The URL to sanitize
        
    Returns:
        URL with only scheme, host, and path
    """
    if not url:
        return ""
    try:
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    except Exception:
        return "[invalid-url]"


async def send_widget_message(room: rtc.Room, message: dict[str, Any]) -> bool:
    """Send a message to the widget via LiveKit data channel.
    
    Message types supported:
    - form_activate: Activate form UI with schema
    - field_focus: Focus on a specific field
    - value_extracted: Show extracted value for confirmation
    - value_confirmed: Confirm a value
    - show_summary: Display form summary
    - submission_success: Form submitted successfully
    - submission_failed: Form submission failed
    - form_deactivated: Form closed/completed
    - agent_message: Agent text response
    - agent_speaking_start/end: Speaking state indicators
    
    Args:
        room: LiveKit room instance
        message: Message dict with 'type' and payload
        
    Returns:
        True if sent successfully, False otherwise
    """
    try:
        data = json.dumps(message).encode("utf-8")
        await room.local_participant.publish_data(data, reliable=True)
        logger.debug(
            "Widget message sent",
            extra={"type": message.get("type")},
        )
        return True
    except Exception as e:
        logger.warning(
            "Failed to send widget message",
            extra={"type": message.get("type"), "error": str(e)},
        )
        return False


__all__ = [
    "sanitize_url_for_logging",
    "send_widget_message",
]
