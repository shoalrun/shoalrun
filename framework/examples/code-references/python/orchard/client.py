"""Synchronous and asynchronous clients for the sample records SDK."""
from collections.abc import AsyncIterator, Iterator, Sequence
from typing import Literal, overload
from .errors import AuthenticationError, NotFoundError
from .models import Record, RecordDict, RecordInput, RecordStatus
from .pagination import Page

class Client:
    """Manage records from a synchronous Python application.

    Create one client per API credential and reuse it across requests. Use
    [AsyncClient](symbol:orchard.client.AsyncClient) in an async application.

    The sample client keeps records in memory; it doesn't make network calls.
    """
    def __init__(self, api_key: str, *, base_url: str = "https://api.example.com/v1", timeout: float = 10.0, max_retries: int = 2):
        """Configure a reusable client.

        Args:
            api_key: Credential used to identify the application.
            base_url: Root URL of the API deployment.
            timeout: Default request timeout, in seconds.
            max_retries: Number of retries for transient failures.

        Raises:
            AuthenticationError: If the API key is empty.
        """
        if not api_key:
            raise AuthenticationError("API key must not be empty")
        self.base_url = base_url
        self.timeout = timeout
        self.max_retries = max_retries
        self._records: dict[str, Record] = {"rec_42": Record("rec_42", "Getting started")}

    @overload
    def fetch(self, record_id: str, *, raw: Literal[False] = False, timeout: float | None = None) -> Record: ...
    @overload
    def fetch(self, record_id: str, *, raw: Literal[True], timeout: float | None = None) -> RecordDict: ...
    def fetch(self, record_id: str, *, raw: bool = False, timeout: float | None = None) -> Record | RecordDict:
        """Retrieve a record by its stable identifier.

        The default response is a typed [Record](symbol:orchard.models.Record).
        Set `raw=True` to receive a dictionary for serialization or a legacy
        integration. An explicit timeout overrides the client's default.

        Args:
            record_id: Stable identifier of the record to retrieve.
            raw: Return a wire-format dictionary instead of a model.
            timeout: Request timeout override, in seconds.

        Returns:
            The record model, or a dictionary when `raw=True`.

        Raises:
            ValueError: If the record identifier is empty.
            NotFoundError: If no record matches the identifier.

        Examples:
            >>> client = Client("demo-key")
            >>> record = client.fetch("rec_42")
            >>> record.title
            'Getting started'
            >>> payload = client.fetch("rec_42", raw=True)
            >>> payload["status"]
            'ready'
        """
        if not record_id:
            raise ValueError("record_id must not be empty")
        if record_id not in self._records:
            raise NotFoundError(f"Record {record_id} was not found")
        record = self._records[record_id]
        return record.to_dict() if raw else record

    def list_records(self, *, limit: int = 20, cursor: str | None = None, status: RecordStatus | None = None) -> Page[Record]:
        """List a single page of records with optional status filtering.

        Use [iter_records](symbol:orchard.client.Client.iter_records) when you
        want to read every page without managing continuation cursors.

        Args:
            limit: Maximum number of records in a page, from 1 to 100.
            cursor: Opaque continuation token from an earlier response.
            status: Include only records with this processing status.

        Returns:
            A page of matching records with an optional continuation cursor.

        Raises:
            ValueError: If the page size is outside the supported range.

        Examples:
            >>> page = client.list_records(limit=10, status=RecordStatus.READY)
            >>> titles = page.map(lambda record: record.title)
        """
        if not 1 <= limit <= 100:
            raise ValueError("limit must be between 1 and 100")
        records = [r for r in self._records.values() if status is None or r.status == status]
        start = int(cursor or "0")
        end = start + limit
        return Page(records[start:end], str(end) if end < len(records) else None, len(records))

    def iter_records(self, *, page_size: int = 20, status: RecordStatus | None = None) -> Iterator[Record]:
        """Iterate through records across every page.

        Pagination is lazy: another page is read only when the iterator needs it.
        Stop iteration early to avoid fetching pages your application won't use.

        Args:
            page_size: Number of records requested per page, from 1 to 100.
            status: Optional processing status filter.

        Yields:
            Records in the service's response order.

        Examples:
            >>> for record in client.iter_records(page_size=50):
            ...     print(record.id, record.title)
        """
        cursor = None
        while True:
            page = self.list_records(limit=page_size, cursor=cursor, status=status)
            yield from page.items
            if not page.has_more:
                return
            cursor = page.next_cursor

    def create_record(self, data: RecordInput, *, idempotency_key: str | None = None) -> Record:
        """Create a record from a typed input model.

        Use an idempotency key when retrying a request after a timeout. Reuse the
        same key only for retries of the same logical operation.

        Args:
            data: Title and labels for the new record.
            idempotency_key: Application-generated retry token.

        Returns:
            An immutable snapshot of the created record.

        Examples:
            >>> data = RecordInput(title="Deployment notes", labels={"team": "platform"})
            >>> record = client.create_record(data, idempotency_key="deploy-42")
        """
        record = Record(f"rec_{len(self._records) + 1}", data.title, labels=data.labels)
        self._records[record.id] = record
        return record

    def bulk_create(self, records: Sequence[RecordInput], *, batch_size: int = 25) -> list[Record]:
        """Create multiple records in bounded batches.

        Args:
            records: Input models to create, in submission order.
            batch_size: Maximum number of records per batch, from 1 to 100.

        Returns:
            Created records in the same order as the submitted inputs.

        Raises:
            ValueError: If the batch size is outside the supported range.
        """
        if not 1 <= batch_size <= 100:
            raise ValueError("batch_size must be between 1 and 100")
        return [self.create_record(item) for item in records]

class AsyncClient:
    """Use the records SDK from an async Python application.

    Await individual operations, or use `async for` to consume a record iterator.
    This example delegates to an in-memory client; no network calls are made.
    """
    def __init__(self, api_key: str, *, timeout: float = 10.0):
        """Configure an async client.

        Args:
            api_key: Application credential.
            timeout: Default request timeout, in seconds.
        """
        self._client = Client(api_key, timeout=timeout)

    async def fetch(self, record_id: str, *, timeout: float | None = None) -> Record:
        """Await a typed record response.

        Args:
            record_id: Stable record identifier.
            timeout: Optional request timeout override, in seconds.

        Returns:
            The matching record model.

        Raises:
            NotFoundError: If the record doesn't exist.

        Examples:
            >>> record = await client.fetch("rec_42")
        """
        return self._client.fetch(record_id, timeout=timeout)

    async def iter_records(self, *, page_size: int = 20) -> AsyncIterator[Record]:
        """Consume paginated records using asynchronous iteration.

        Args:
            page_size: Maximum number of records read in one page.

        Yields:
            Typed records from successive pages.

        Examples:
            >>> async for record in client.iter_records(page_size=50):
            ...     print(record.title)
        """
        for record in self._client.iter_records(page_size=page_size):
            yield record
