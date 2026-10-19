---
id: reference.cedar.getParcel
title: Get a parcel
summary: GET /parcels/{parcelId}
type: api-reference
area: api
subarea: api-reference
canonical: /example-api/cedar/get-parcel-edee10e6
---

# Get a parcel

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Examples > Cedar Parcel API · styling lab > Parcels > Get a parcel

**Updated: 2026-10-19.**

> Fictional API example. This page demonstrates documentation features; its operations do not describe a live service.

This reference is generated from the OpenAPI description. It shows the operation contract; follow any related guides below for task steps and context.

OpenAPI for this operation: [Download JSON](https://www.shoalrun.com/api/operations/production/current/en/cedar-getparcel-93cdaec636ea6466eb0bee3486d38759473a72eae27c8bb56f644ff654d0372f.json).

## GET /parcels/{parcelId}

Get a parcel

This lookup route does not use the API's default authentication.

### Servers

`https://lookup.api.cedar-parcel.example/v1` — Public lookup host

### Authentication

No authentication required.

### Parameters

#### parcelId (path)

Required

string

### Example request

```bash
curl --request GET \
  --url 'https://lookup.api.cedar-parcel.example/v1/parcels/YOUR_PARCELID'
```

### Responses

#### 200: OK

`application/json`

Parcel found.

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

#### 404: Not Found

`application/problem+json`

No parcel has that identifier.

4 properties

- `type` `string` **always present**&#x20;

  format: uri

- `title` `string` **always present**&#x20;

- `status` `integer` **always present**&#x20;

- `detail` `string` **may be absent**&#x20;
