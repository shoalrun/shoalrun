---
id: reference.content-rest.getContentRepresentation
title: Read HTML or Markdown
summary: GET /resources/{key}/representations/{format}
type: api-reference
area: api
subarea: api-reference
canonical: /content-delivery/http-api/operations/get-content-representation-fa1d2e3f
---

# Read HTML or Markdown

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > Content REST API > Other > Read HTML or Markdown

**Updated: 2026-09-27.**

This reference is generated from the OpenAPI description. It shows the operation contract; follow any related guides below for task steps and context.

OpenAPI for this operation: [Download JSON](https://www.shoalrun.com/api/operations/production/current/en/content-rest-getcontentrepresentation-63a66b7a4eae1e1befb0ade4fd57d8346e3a5548cb933c1718acc72a9ab3ceed.json).

## GET /resources/{key}/representations/{format}

Read HTML or Markdown

Query parameters are single-valued; unknown or duplicate parameters are rejected. Publication and revision checks run before conditional ETag checks. No pagination, search, writes, authentication, or cross-origin policy is supplied by this reference adapter.

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

Required

Exact revision returned by the list endpoint. A different revision returns 409; it never silently reads newer content.

string; pattern: ^\[a-f0-9]{64}$

**Default example**: `"0770e6d70db51967fac8dcc7bb4ff5a5bff87378eb2e2bbb63dea93d090c82e8"`

#### key (path)

Required

Opaque stable typed-reference key. Use the returned key. It is k\_ followed by unpadded base64url of UTF-8 JSON for \["page",documentId], \["section",documentId,sectionId], or \["snippet",id]. Publication and revision are separate selectors.

string; pattern: ^k\_\[A-Za-z0-9\_-]+$

**Default example**: `"k_WyJwYWdlIiwiZ3VpZGUuYmlsbGluZyJd"`

#### format (path)

Required

string

Available options: `"html"`, `"markdown"`

**Default example**: `"markdown"`

#### If-None-Match (header)

Optional

An ETag, comma-separated ETags, or \*. Weak comparison is supported for GET and HEAD.

string

### Example request

```bash
curl --request GET \
  --url 'https://YOUR_API_HOST/content/v1/resources/YOUR_KEY/representations/YOUR_FORMAT?channel=YOUR_CHANNEL&version=YOUR_VERSION&language=YOUR_LANGUAGE&revision=YOUR_REVISION'
```

### Responses

#### 200: OK

`text/html`

`text/markdown`

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

##### text/html

string

##### Example: Illustrative content; discover keys and revision from your own host.

Key: illustrative. Location: response 200; text/html. Authored in OpenAPI.

```text
<p>Contact support.</p>

```

##### text/markdown

string

##### Example: Illustrative content; discover keys and revision from your own host.

Key: illustrative. Location: response 200; text/markdown. Authored in OpenAPI.

```text
Contact support.

```

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

`application/json`

invalid_request: missing, duplicate, unknown, or malformed query parameter.

##### Response headers

###### Cache-Control

Optional

Serialization: simple; explode: false.

const: "no-store"

1 property

- `error` `object` **always present**&#x20;

  2 properties

  - `code` `enum<string>` **always present**&#x20;

    Available options: `"invalid_request"`, `"not_found"`, `"unsupported_format"`, `"stale_revision"`, `"method_not_allowed"`, `"internal_error"`

  - `message` `string` **always present**&#x20;

  Additional properties: not allowed.

Additional properties: not allowed.

#### 404: Not Found

`application/json`

not_found: unknown publication, resource, or route.

##### Response headers

###### Cache-Control

Optional

Serialization: simple; explode: false.

const: "no-store"

1 property

- `error` `object` **always present**&#x20;

  2 properties

  - `code` `enum<string>` **always present**&#x20;

    Available options: `"invalid_request"`, `"not_found"`, `"unsupported_format"`, `"stale_revision"`, `"method_not_allowed"`, `"internal_error"`

  - `message` `string` **always present**&#x20;

  Additional properties: not allowed.

Additional properties: not allowed.

#### 405: Method Not Allowed

`application/json`

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

1 property

- `error` `object` **always present**&#x20;

  2 properties

  - `code` `enum<string>` **always present**&#x20;

    Available options: `"invalid_request"`, `"not_found"`, `"unsupported_format"`, `"stale_revision"`, `"method_not_allowed"`, `"internal_error"`

  - `message` `string` **always present**&#x20;

  Additional properties: not allowed.

Additional properties: not allowed.

#### 406: Not Acceptable

`application/json`

unsupported_format: unsupported or unavailable representation format.

##### Response headers

###### Cache-Control

Optional

Serialization: simple; explode: false.

const: "no-store"

1 property

- `error` `object` **always present**&#x20;

  2 properties

  - `code` `enum<string>` **always present**&#x20;

    Available options: `"invalid_request"`, `"not_found"`, `"unsupported_format"`, `"stale_revision"`, `"method_not_allowed"`, `"internal_error"`

  - `message` `string` **always present**&#x20;

  Additional properties: not allowed.

Additional properties: not allowed.

#### 409: Conflict

`application/json`

stale_revision: revision unavailable, or source bytes no longer match the pinned snapshot.

##### Response headers

###### Cache-Control

Optional

Serialization: simple; explode: false.

const: "no-store"

1 property

- `error` `object` **always present**&#x20;

  2 properties

  - `code` `enum<string>` **always present**&#x20;

    Available options: `"invalid_request"`, `"not_found"`, `"unsupported_format"`, `"stale_revision"`, `"method_not_allowed"`, `"internal_error"`

  - `message` `string` **always present**&#x20;

  Additional properties: not allowed.

Additional properties: not allowed.

#### 500: Internal Server Error

`application/json`

internal_error: the source could not complete the request.

##### Response headers

###### Cache-Control

Optional

Serialization: simple; explode: false.

const: "no-store"

1 property

- `error` `object` **always present**&#x20;

  2 properties

  - `code` `enum<string>` **always present**&#x20;

    Available options: `"invalid_request"`, `"not_found"`, `"unsupported_format"`, `"stale_revision"`, `"method_not_allowed"`, `"internal_error"`

  - `message` `string` **always present**&#x20;

  Additional properties: not allowed.

Additional properties: not allowed.
