"""Typed request and response models for the records API."""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import TypedDict

class RecordStatus(str, Enum):
    """Processing status reported by a record.

    A record moves from `pending` to `ready` after processing completes.
    Failed records retain their identifier so an application can retry them.
    """
    PENDING = "pending"
    """The record is waiting for processing."""
    READY = "ready"
    """The record can be read by applications."""
    FAILED = "failed"
    """Processing failed and needs a retry."""

class RecordDict(TypedDict):
    """Wire representation returned when `Client.fetch(raw=True)` is used."""
    id: str
    """Stable record identifier."""
    title: str
    """Human-readable record title."""
    status: str
    """Processing state encoded as a string."""

@dataclass(frozen=True)
class RecordInput:
    """Input used to create a record.

    Provide a title and optional labels. Labels let applications group records
    without encoding business rules into the record identifier.
    """
    title: str
    """Title to display to readers."""
    labels: dict[str, str] = field(default_factory=dict)
    """Application-defined labels, such as `team` or `environment`."""

@dataclass(frozen=True)
class Record:
    """A record returned by the service.

    Records are immutable snapshots. Fetch the record again to observe a new
    processing status rather than changing its fields locally.
    """
    id: str
    """Stable identifier used in fetch and update operations."""
    title: str
    """Human-readable title."""
    status: RecordStatus = RecordStatus.READY
    """Current processing state."""
    labels: dict[str, str] = field(default_factory=dict)
    """Application-defined key/value labels."""
    created_at: datetime | None = None
    """Creation time in UTC, if reported by the service."""

    def to_dict(self) -> RecordDict:
        """Convert a record to its compact wire representation.

        Returns:
            A mapping with the identifier, title, and string status.

        Examples:
            >>> Record("rec_42", "Example").to_dict()
            {'id': 'rec_42', 'title': 'Example', 'status': 'ready'}
        """
        return {"id": self.id, "title": self.title, "status": self.status.value}
