---
id: reference.cedar.parcelDelivered
title: Parcel delivered event
summary: "Webhook event: parcel.delivered"
type: api-reference
area: api
subarea: api-reference
canonical: /example-api/cedar/parcel-delivered-7d1ba6db
---

# Parcel delivered event

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Examples > Cedar Parcel API · styling lab > Parcels > Parcel delivered event

**Updated: 2026-10-19.**

> Fictional API example. This page demonstrates documentation features; its operations do not describe a live service.

This webhook reference is generated from the OpenAPI description. The provider sends this event to the receiver.

OpenAPI for this operation: [Download JSON](https://www.shoalrun.com/api/operations/production/current/en/cedar-parceldelivered-ee7a193b8a236fe55bf24a20d15e8a4b8070165ed00f4d62899e0de91560f188.json).

## Webhook: parcel.delivered

The provider sends a POST request for this event to the receiver's webhook URL.

Parcel delivered event

The service sends this event to the receiver's webhook URL.

### Authentication

Use one of these authentication options:

**Bearer token**

HTTP bearer (JWT).

Short-lived service token.

**API key**

API key in header X-Parcel-Key.

Long-lived account key.

### Request body

Required.

#### application/json

5 properties

- `eventId` `string` **required**&#x20;

- `parcelId` `string` **required**&#x20;

- `occurredAt` `string` **required**&#x20;

  format: date-time

- `outcome` `enum<string>` **required**&#x20;

  Available options: `"delivered"`, `"returned"`

- `proof` `one of several types` **required**&#x20;

  Use exactly one of these shapes:

  **Photo proof** · 2 properties

  object

  2 properties

  - `kind` `string` **required**&#x20;

    const: "photo"

  - `url` `string` **required**&#x20;

    format: uri

  **Signature proof** · 2 properties

  object

  2 properties

  - `kind` `string` **required**&#x20;

    const: "signature"

  - `signedBy` `string` **required**&#x20;

##### Example: Delivered at doorstep

Key: doorstep. Location: request; application/json. Authored in OpenAPI.

```json
{
  "eventId": "evt_demo_001",
  "parcelId": "pcl_demo_001",
  "occurredAt": "2026-01-02T10:15:00Z",
  "outcome": "delivered",
  "proof": {
    "kind": "photo",
    "url": "https://media.cedar-parcel.example/proof/demo.jpg"
  }
}
```

### Responses

#### 204: No Content

Receiver accepted the event.
