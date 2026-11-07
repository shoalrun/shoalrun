"""A sample SDK for working with records, collections, and paginated results.

Use [Client](symbol:orchard.client.Client) in synchronous applications, or
[AsyncClient](symbol:orchard.client.AsyncClient) in an async service. Models,
pagination helpers, and typed exceptions have their own reference pages.

This package is documentation example code. It doesn't contact a live service.
"""
from .client import AsyncClient, Client
from .models import Record, RecordInput, RecordStatus
from .pagination import Page
