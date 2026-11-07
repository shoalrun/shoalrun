"""Typed errors an application can handle without inspecting error messages."""

class APIError(Exception):
    """Base error for unsuccessful API operations.

    Handle a more specific exception when your application can recover from it.
    Use `request_id` when reporting a failed request to an operator.
    """
    def __init__(self, message: str, *, request_id: str | None = None):
        super().__init__(message)
        self.request_id = request_id

class AuthenticationError(APIError):
    """The API key is missing, expired, or invalid.

    Refresh the credential before retrying the request. Repeating the same
    request with the same invalid credential won't resolve this error.
    """

class NotFoundError(APIError):
    """The requested record doesn't exist or isn't visible to the API key."""

class RateLimitError(APIError):
    """The service rejected a request because its rate limit was reached.

    Wait for `retry_after` seconds before retrying. Add jitter when multiple
    workers share the same credentials.
    """
    def __init__(self, message: str, *, retry_after: float, request_id: str | None = None):
        super().__init__(message, request_id=request_id)
        self.retry_after = retry_after
