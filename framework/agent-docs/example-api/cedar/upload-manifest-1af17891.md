---
id: reference.cedar.uploadManifest
title: Upload a manifest
summary: POST /manifests
type: api-reference
area: api
subarea: api-reference
canonical: /example-api/cedar/upload-manifest-1af17891
---

# Upload a manifest

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Examples > Cedar Parcel API · styling lab > Manifests > Upload a manifest

**Updated: 2026-10-19.**

> Fictional API example. This page demonstrates documentation features; its operations do not describe a live service.

This reference is generated from the OpenAPI description. It shows the operation contract; follow any related guides below for task steps and context.

OpenAPI for this operation: [Download JSON](https://www.shoalrun.com/api/operations/production/current/en/cedar-uploadmanifest-a03b1eb7fa7e30da2fd0dc705e6a279ad1234f27da77ea6a0649a95a8a4f5403.json).

## POST /manifests

Upload a manifest

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

### Request body

Required.

#### multipart/form-data

object

2 properties

- `manifest` `string` **required**&#x20;

  format: binary

  Dispatch data file.

- `checksum` `string` **required**&#x20;

  format: binary

  Separate checksum file.

### Example request

```bash
curl --request POST \
  --url 'https://sandbox.api.cedar-parcel.example/v1/manifests' \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --form 'manifest=@YOUR_MANIFEST' \
  --form 'checksum=@YOUR_CHECKSUM'
```

### Responses

#### 202: Accepted

`application/json`

Upload accepted for validation.

object

2 properties

- `jobId` `string` **always present**&#x20;

- `status` `enum<string>` **always present**&#x20;

  Available options: `"queued"`, `"validating"`
