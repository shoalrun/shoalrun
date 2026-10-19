---
id: reference.cedar.listParcels
title: List parcel records
summary: GET /Search/parcels/{scope}
type: api-reference
area: api
subarea: api-reference
subjectLifecycle: in-development
canonical: /example-api/cedar/list-parcels-0345fb5f
---

# List parcel records

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Examples > Cedar Parcel API · styling lab > Query > List parcel records

**Updated: 2026-10-19.**

**Status: In development.**

> Fictional API example. This page demonstrates documentation features; its operations do not describe a live service.

This reference is generated from the OpenAPI description. It shows the operation contract; follow any related guides below for task steps and context.

OpenAPI for this operation: [Download JSON](https://www.shoalrun.com/api/operations/production/current/en/cedar-listparcels-b04dddee79753501d9f40ff84583f7b915b7cb919cf9f442e7c2b47ea3c4d7e3.json).

## GET /Search/parcels/{scope}

List parcel records

List records for an account or region. Use `downloadAs` to request a
file; the same successful status can return JSON, CSV, or a spreadsheet.

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

#### scope (path)

Required

The account or region identifier.

string

**Default example**: `"region-demo"`

#### Filters (query)

Optional

OpenAPI calls this placeholder `parameters`. Send a filter expression directly in the query string, without `parameters=`.

Query form: `?declaredValue(gt)=100`. Replace the field, operator, and value for your filter.

Source notes, accepted fields, and operators

Placeholder for field/operator filters. Do not send `parameters=`.
Put each expression directly in the URL, for example
`declaredValue(gt)=100`.

Accepted fields: `createdAt` (gt, ge, lt, le, eq),
`declaredValue` (gt, ge, lt, le, eq), `carrier` (eq, ne, in),
`recipientCity` (eq, ct), and `status` (eq, ne, in).
`in` values are separated by `|`.

object

Additional-key schema:

string

**High declared value**: `declaredValue(gt)=100`

**City contains text**: `recipientCity(ct)=port`

#### downloadAs (query)

Optional

Return a file instead of JSON when specified.

string

Available options: `"csv"`, `"xlsx"`

#### skipRows (query)

Optional

Number of records to skip.

integer; default: 0

#### maxRows (query)

Optional

Maximum records to return. Zero or a negative value requests all records.

integer; default: 20

### Example request

```bash
curl --request GET \
  --url 'https://sandbox.api.cedar-parcel.example/v1/Search/parcels/YOUR_SCOPE?recipientCity(ct)=port' \
  --header 'Authorization: Bearer YOUR_TOKEN'
```

### Responses

#### 200: OK

`application/json`

`text/csv`

`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

A page of records, or a downloadable file if `downloadAs` is set.
The response format depends on the query value.

##### application/json

minProperties: 3; maxProperties: 3

3 properties

- `records` `list of object` **always present**&#x20;

  uniqueItems: true

  Array items:

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

- `totalRecords` `integer` **always present**&#x20;

  minimum: 0

- `nextCursor` `string` **always present** **nullable**&#x20;

  Always present; null on the last page.

Additional properties: not allowed.

##### Example: First page

Key: firstPage. Location: response 200; application/json. Authored in OpenAPI.

```json
{
  "records": [
    {
      "parcelId": "pcl_demo_001",
      "status": "in_transit",
      "declaredValue": 145.5,
      "recipient": {
        "city": "Northport",
        "postalCode": "00012"
      }
    }
  ],
  "totalRecords": 1,
  "nextCursor": null
}
```

##### text/csv

string

CSV rows with a header line.

##### Example: Default example

Key: default. Location: response 200; text/csv. Authored in OpenAPI.

```text
parcelId,status,declaredValue
pcl_demo_001,in_transit,145.5

```

##### application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

string; format: binary

A spreadsheet download.

#### 400: Bad Request

`application/problem+json`

A field name or comparison operator is unsupported.

4 properties

- `type` `string` **always present**&#x20;

  format: uri

- `title` `string` **always present**&#x20;

- `status` `integer` **always present**&#x20;

- `detail` `string` **may be absent**&#x20;
