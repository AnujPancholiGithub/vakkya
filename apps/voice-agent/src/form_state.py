"""Centralized form collection state management.

This module provides the source of truth for form field values collected
via both voice and keyboard inputs. It ensures consistent state tracking
regardless of input source.

Validates: Requirements 7.1, 7.2, 7.3, 7.4
"""

import time
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class ConfirmedField:
    """A confirmed form field value with metadata.
    
    Attributes:
        value: The confirmed field value
        source: Input source - 'keyboard' or 'voice'
        confirmed_at: Unix timestamp when field was confirmed
    """
    value: Any
    source: str  # 'keyboard' or 'voice'
    confirmed_at: float


@dataclass
class FormCollectionState:
    """Centralized form collection state.
    
    This is the single source of truth for all confirmed field values,
    regardless of whether they were collected via voice or keyboard.
    
    Attributes:
        form_id: The form schema ID
        confirmed_fields: Dict mapping field names to ConfirmedField
        current_field_index: Index of current field being collected
        total_fields: Total number of fields in the form
        is_complete: Whether all required fields are collected
    """
    form_id: str
    confirmed_fields: dict[str, ConfirmedField] = field(default_factory=dict)
    current_field_index: int = 0
    total_fields: int = 0
    is_complete: bool = False
    _required_fields: list[str] = field(default_factory=list)
    
    def add_confirmed_field(
        self,
        field_name: str,
        value: Any,
        source: str = "voice"
    ) -> None:
        """Add or update a confirmed field value.
        
        Args:
            field_name: Name of the field
            value: The confirmed value
            source: Input source - 'keyboard' or 'voice'
        """
        self.confirmed_fields[field_name] = ConfirmedField(
            value=value,
            source=source,
            confirmed_at=time.time(),
        )
        self._check_completion()
    
    def is_field_confirmed(self, field_name: str) -> bool:
        """Check if a field has been confirmed.
        
        Args:
            field_name: Name of the field to check
            
        Returns:
            True if field exists in confirmed_fields
        """
        return field_name in self.confirmed_fields
    
    def get_next_uncollected_field_index(
        self,
        fields: list[dict[str, Any]]
    ) -> int:
        """Get the index of the next uncollected field.
        
        Skips over fields that are already in confirmed_fields.
        
        Args:
            fields: List of field definitions from form schema
            
        Returns:
            Index of next uncollected field, or len(fields) if all collected
        """
        for i, field_def in enumerate(fields):
            field_name = field_def.get("name", "")
            if field_name and field_name not in self.confirmed_fields:
                return i
        return len(fields)
    
    def set_required_fields(self, fields: list[dict[str, Any]]) -> None:
        """Set the list of required field names from schema.
        
        Args:
            fields: List of field definitions from form schema
        """
        self._required_fields = [
            f.get("name", "")
            for f in fields
            if f.get("required", True) and f.get("name")
        ]
        self.total_fields = len(fields)
        self._check_completion()
    
    def _check_completion(self) -> None:
        """Check if all required fields are collected and update is_complete."""
        if not self._required_fields:
            self.is_complete = False
            return
        
        self.is_complete = all(
            field_name in self.confirmed_fields
            for field_name in self._required_fields
        )
    
    def get_confirmed_values(self) -> dict[str, Any]:
        """Get all confirmed values as a simple dict.
        
        Returns:
            Dict mapping field names to their values
        """
        return {
            name: cf.value
            for name, cf in self.confirmed_fields.items()
        }
    
    def to_dict(self) -> dict[str, Any]:
        """Serialize state to dictionary for JSON responses.
        
        Returns:
            Dict representation of form state
        """
        return {
            "form_id": self.form_id,
            "confirmed_fields": {
                name: {"value": cf.value, "source": cf.source}
                for name, cf in self.confirmed_fields.items()
            },
            "current_field_index": self.current_field_index,
            "total_fields": self.total_fields,
            "is_complete": self.is_complete,
        }
