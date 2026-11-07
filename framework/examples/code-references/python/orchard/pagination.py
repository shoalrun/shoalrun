"""Generic containers and cursor helpers for paginated responses."""
from dataclasses import dataclass
from typing import Callable, Generic, TypeVar

T = TypeVar("T")
U = TypeVar("U")

@dataclass(frozen=True)
class Page(Generic[T]):
    """One page of results and the cursor needed to continue reading.

    Keep the cursor opaque. Pass it back to `Client.list_records` instead of
    decoding it or building a cursor from a record identifier.
    """
    items: list[T]
    """Results included in this response."""
    next_cursor: str | None = None
    """Continuation cursor, or `None` when this is the final page."""
    total: int | None = None
    """Total result count when the service can provide one."""

    @property
    def has_more(self) -> bool:
        """Whether another page is available."""
        return self.next_cursor is not None

    def map(self, transform: Callable[[T], U]) -> "Page[U]":
        """Transform every item while preserving pagination metadata.

        Args:
            transform: Function applied once to each item in this page.

        Returns:
            A new page containing transformed items and the same cursor.

        Examples:
            >>> page.map(lambda record: record.title)
        """
        return Page([transform(item) for item in self.items], self.next_cursor, self.total)
