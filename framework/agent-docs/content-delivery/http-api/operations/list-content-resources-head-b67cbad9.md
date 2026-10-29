---
id: reference.content-rest.listContentResourcesHead
title: List resource metadata headers
summary: HEAD /resources
type: api-reference
area: api
subarea: api-reference
canonical: /content-delivery/http-api/operations/list-content-resources-head-b67cbad9
---

# List resource metadata headers

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > Content REST API > Other > List resource metadata headers

**Updated: 2026-10-28.**

This reference is generated from the OpenAPI description. It shows the operation contract; follow any related guides below for task steps and context.

OpenAPI for this operation: [Download JSON](https://www.shoalrun.com/api/operations/production/current/en/content-rest-listcontentresourceshead-220a5fd6f9ff22577a0823f7f772b7f76e01c38aa0b24dd895d7a91ebbad4021.json).

## HEAD /resources

List resource metadata headers

Query parameters are single-valued; unknown or duplicate parameters are rejected. Publication and revision checks run before conditional ETag checks. No pagination, search, writes, authentication, or cross-origin policy is supplied by this reference adapter. HEAD returns the GET status and headers without a response body.

### Servers

`/content/v1`

### Parameters

#### channel (query)

Required

Exact publication channel. No default or fallback.

string; minLength: 1; maxLength: 2048

**Default example**: `"production"`

#### version (query)

Required

Exact publication version. No default or fallback.

string; minLength: 1; maxLength: 2048

**Default example**: `"current"`

#### language (query)

Required

Exact publication language. No default or fallback.

string; minLength: 1; maxLength: 2048

**Default example**: `"en"`

#### revision (query)

Optional

Omit to discover the currently supplied snapshot. Supply to require that exact revision.

string; pattern: ^\[a-f0-9]{64}$

**Default example**: `"0770e6d70db51967fac8dcc7bb4ff5a5bff87378eb2e2bbb63dea93d090c82e8"`

#### If-None-Match (header)

Optional

An ETag, comma-separated ETags, or \*. Weak comparison is supported for GET and HEAD.

string

### Example request

```bash
curl --head \
  --url 'https://YOUR_API_HOST/content/v1/resources?channel=YOUR_CHANNEL&version=YOUR_VERSION&language=YOUR_LANGUAGE'
```

### Responses

#### 200: OK

The selected resource or inventory.

##### Response headers

###### ETag

Optional

Strong SHA-256 validator of the exact UTF-8 response bytes.

Serialization: simple; explode: false.

string

###### Cache-Control

Optional

Unpinned discovery uses no-cache. Revision-pinned success uses public, max-age=31536000, immutable. Errors use no-store.

Serialization: simple; explode: false.

string

#### 304: Not Modified

The validated selected response matches If-None-Match. No response body.

##### Response headers

###### ETag

Optional

Strong SHA-256 validator of the exact UTF-8 response bytes.

Serialization: simple; explode: false.

string

###### Cache-Control

Optional

Unpinned discovery uses no-cache. Revision-pinned success uses public, max-age=31536000, immutable. Errors use no-store.

Serialization: simple; explode: false.

string

#### 400: Bad Request

invalid_request: missing, duplicate, unknown, or malformed query parameter.

##### Response headers

###### Cache-Control

Optional

Serialization: simple; explode: false.

const: "no-store"

#### 404: Not Found

not_found: unknown publication, resource, or route.

##### Response headers

###### Cache-Control

Optional

Serialization: simple; explode: false.

const: "no-store"

#### 405: Method Not Allowed

method_not_allowed: only GET and HEAD are supported; Allow lists both.

##### Response headers

###### Cache-Control

Optional

Serialization: simple; explode: false.

const: "no-store"

###### Allow

Optional

Serialization: simple; explode: false.

const: "GET, HEAD"

#### 406: Not Acceptable

unsupported_format: unsupported or unavailable representation format.

##### Response headers

###### Cache-Control

Optional

Serialization: simple; explode: false.

const: "no-store"

#### 409: Conflict

stale_revision: revision unavailable, or source bytes no longer match the pinned snapshot.

##### Response headers

###### Cache-Control

Optional

Serialization: simple; explode: false.

const: "no-store"

#### 500: Internal Server Error

internal_error: the source could not complete the request.

##### Response headers

###### Cache-Control

Optional

Serialization: simple; explode: false.

const: "no-store"
