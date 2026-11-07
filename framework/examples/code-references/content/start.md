---
id: guide.start
title: Python SDK
summary: Explore a typed SDK with synchronous and async clients, models, pagination, and exceptions.
type: guide
slug: /
channel: production
version: current
language: en
access: { policy: public }
---
This example SDK manages records. Its reference pages are generated from Python source and docstrings, then rendered with Shoalrun's normal theme, navigation, search, and Markdown output.

The sample client stores records in memory. It doesn't connect to a live service.

## Fetch a typed record

```python
from orchard import Client

client = Client("demo-key")
record = client.fetch("rec_42")
print(record.title)
```

Read [Client](doc:reference.client) for configuration and [fetch](doc:reference.fetch) for its typed and raw-response overloads.

## Work with more than one page

```python
from orchard import RecordStatus

for record in client.iter_records(page_size=50, status=RecordStatus.READY):
    print(record.id, record.title)
```

Choose [list_records](doc:reference.Client.list_records) when your application needs explicit cursor control, or [Page.map](doc:reference.pagination.Page.map) to transform a response without losing its pagination metadata.

## Use an async client

```python
from orchard import AsyncClient

client = AsyncClient("demo-key")
async for record in client.iter_records(page_size=50):
    print(record.title)
```

Browse [AsyncClient](doc:reference.AsyncClient), [Record](doc:reference.models.Record), and the [typed exceptions](doc:reference.errors) to see how the generated reference fits together.

## Choose how to browse

Read the [Client class with member details inline](doc:reference.client), or open the [complete Python SDK reference](doc:reference.complete) to browse everything on one page. The example uses `layout: classes` and enables `singlePage` in its catalog configuration. Individual symbol links remain available.
