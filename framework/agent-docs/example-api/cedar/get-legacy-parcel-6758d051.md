---
id: reference.cedar.getLegacyParcel
title: Get a parcel through the old route
summary: GET /legacy/parcels/{parcelId}
type: api-reference
area: api
subarea: api-reference
subjectLifecycle: deprecated
canonical: /example-api/cedar/get-legacy-parcel-6758d051
---

# Get a parcel through the old route

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Examples > Cedar Parcel API · styling lab > Legacy > Get a parcel through the old route

**Updated: 2026-10-19.**

**Status: Deprecated.**

> Fictional API example. This page demonstrates documentation features; its operations do not describe a live service.

This reference is generated from the OpenAPI description. It shows the operation contract; follow any related guides below for task steps and context.

OpenAPI for this operation: [Download JSON](https://www.shoalrun.com/api/operations/production/current/en/cedar-getlegacyparcel-28a0e963820692d2720aedadf59439a8ca0adf7c3ada2ccb554cfac45094e1f4.json).

## GET /legacy/parcels/{parcelId}

Get a parcel through the old route

Deprecated operation.

### Servers

`https://sandbox.api.cedar-parcel.example/v1` — Sandbox

`https://api.cedar-parcel.example/v1` — Production

### Authentication

Use one of these authentication options:

**Bearer token**

HTTP bearer (JWT).

Short-lived service token.

**API key**

API key in header X-Parcel-Key.

Long-lived account key.

### Parameters

#### parcelId (path)

Required

string

### Example request

```bash
curl --request GET \
  --url 'https://sandbox.api.cedar-parcel.example/v1/legacy/parcels/YOUR_PARCELID' \
  --header 'Authorization: Bearer YOUR_TOKEN'
```

### Responses

#### 200: OK

`application/json`

Parcel found. Use the current lookup route for new integrations.

5 properties

- `parcelId` `string` **always present**&#x20;

- `status` `enum<string>` **always present**&#x20;

  Available options: `"label_created"`, `"in_transit"`, `"delivered"`, `"exception"`

- `declaredValue` `number` **always present**&#x20;

  minimum: 0; multipleOf: 0.01

  Value in currency units, to the nearest cent.

- `recipient` `object` **always present**&#x20;

  2 properties

  - `city` `string` **always present**&#x20;

  - `postalCode` `string` **always present**&#x20;

- `events` `list of object` **may be absent**&#x20;

  Tracking history in chronological order.

  Array items:

  object

  3 properties

  - `kind` `enum<string>` **always present**&#x20;

    Available options: `"pickup"`, `"scan"`, `"delivery"`

  - `at` `string` **always present**&#x20;

    format: date-time

  - `details` `string` **may be absent** **nullable**&#x20;
