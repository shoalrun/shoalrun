---
id: reference.content-rest.getContentResource
title: Read resource metadata
summary: GET /resources/{key}
type: api-reference
area: api
subarea: api-reference
canonical: /content-delivery/http-api/operations/get-content-resource-849f1c49
---

# Read resource metadata

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Content delivery > Content REST API > Other > Read resource metadata

**Updated: 2026-09-27.**

This reference is generated from the OpenAPI description. It shows the operation contract; follow any related guides below for task steps and context.

OpenAPI for this operation: [Download JSON](https://www.shoalrun.com/api/operations/production/current/en/content-rest-getcontentresource-4b468f0730abbf5c55d4ff2f678fc6f5f742e2032607aeae96fcc11fb62addb4.json).

## GET /resources/{key}

Read resource metadata

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

#### If-None-Match (header)

Optional

An ETag, comma-separated ETags, or \*. Weak comparison is supported for GET and HEAD.

string

### Example request

```bash
curl --request GET \
  --url 'https://YOUR_API_HOST/content/v1/resources/YOUR_KEY?channel=YOUR_CHANNEL&version=YOUR_VERSION&language=YOUR_LANGUAGE&revision=YOUR_REVISION'
```

### Responses

#### 200: OK

`application/json`

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

5 properties

- `schemaVersion` `number` **always present**&#x20;

  const: 1

- `revision` `string` **always present**&#x20;

  pattern: ^\[a-f0-9]{64}$

- `publication` `object` **always present**&#x20;

  3 properties

  - `channel` `string` **always present**&#x20;

    minLength: 1

  - `version` `string` **always present**&#x20;

    minLength: 1

  - `language` `string` **always present**&#x20;

    minLength: 1

  Additional properties: not allowed.

- `key` `string` **always present**&#x20;

  Opaque stable typed-reference key. Use the returned key. It is k\_ followed by unpadded base64url of UTF-8 JSON for \["page",documentId], \["section",documentId,sectionId], or \["snippet",id]. Publication and revision are separate selectors.

  pattern: ^k\_\[A-Za-z0-9\_-]+$

- `resource` `object` **always present**&#x20;

  10 properties

  - `publication` `object` **always present**&#x20;

    3 properties

    - `channel` `string` **always present**&#x20;

      minLength: 1

    - `version` `string` **always present**&#x20;

      minLength: 1

    - `language` `string` **always present**&#x20;

      minLength: 1

    Additional properties: not allowed.

  - `title` `string` **always present**&#x20;

  - `summary` `string` **always present**&#x20;

  - `type` `string` **always present**&#x20;

  - `canonicalUrl` `string` **may be absent**&#x20;

    format: uri

  - `representations` `object` **always present**&#x20;

    minProperties: 1

    2 properties

    - `html` `object` **may be absent**&#x20;

      6 properties

      - `path` `string` **always present**&#x20;

        pattern: ^(?:NOTICES\\.txt|(?:content|assets)/(?!\\.{1,2}(?:/|$))\[A-Za-z0-9\_.-]+(?:/(?!\\.{1,2}(?:/|$))\[A-Za-z0-9\_.-]+)\*)$

      - `bytes` `integer` **always present**&#x20;

        minimum: 0

      - `digest` `string` **always present**&#x20;

        pattern: ^\[a-f0-9]{64}$

      - `mediaType` `string` **always present**&#x20;

      - `anchors` `list of object` **always present**&#x20;

        Array items:

        object

        3 properties

        - `id` `string` **always present**&#x20;

        - `exportedId` `string` **always present**&#x20;

        - `title` `string` **may be absent**&#x20;

        Additional properties: not allowed.

      - `links` `list of one of several types` **always present**&#x20;

        Array items:

        The response has exactly one of these shapes:

        **Shape 1** · 6 properties

        object

        6 properties

        - `key` `string` **always present**&#x20;

        - `kind` `enum<string>` **always present**&#x20;

          Available options: `"resource"`

        - `href` `string` **always present**&#x20;

        - `fragment` `string` **may be absent**&#x20;

        - `query` `string` **may be absent**&#x20;

        - `ref` `one of several types` **always present**&#x20;

          The response has exactly one of these shapes:

          **Shape 1** · 2 properties

          object

          2 properties

          - `kind` `string` **always present**&#x20;

            const: "page"

          - `documentId` `string` **always present**&#x20;

            minLength: 1

          Additional properties: not allowed.

          **Shape 2** · 3 properties

          object

          3 properties

          - `kind` `string` **always present**&#x20;

            const: "section"

          - `documentId` `string` **always present**&#x20;

            minLength: 1

          - `sectionId` `string` **always present**&#x20;

            pattern: ^\[a-z0-9]\[a-z0-9-]{0,511}$

          Additional properties: not allowed.

          **Shape 3** · 2 properties

          object

          2 properties

          - `kind` `string` **always present**&#x20;

            const: "snippet"

          - `id` `string` **always present**&#x20;

            pattern: ^\[A-Za-z\_]\[A-Za-z0-9\_.-]\*$

          Additional properties: not allowed.

        Additional properties: not allowed.

        **Shape 2** · 6 properties

        object

        6 properties

        - `key` `string` **always present**&#x20;

        - `kind` `enum<string>` **always present**&#x20;

          Available options: `"asset"`

        - `href` `string` **always present**&#x20;

        - `fragment` `string` **may be absent**&#x20;

        - `query` `string` **may be absent**&#x20;

        - `asset` `string` **always present**&#x20;

          pattern: ^(?:NOTICES\\.txt|(?:content|assets)/(?!\\.{1,2}(?:/|$))\[A-Za-z0-9\_.-]+(?:/(?!\\.{1,2}(?:/|$))\[A-Za-z0-9\_.-]+)\*)$

        Additional properties: not allowed.

        **Shape 3** · 5 properties

        object

        5 properties

        - `key` `string` **always present**&#x20;

        - `kind` `enum<string>` **always present**&#x20;

          Available options: `"canonical"`, `"external"`

        - `href` `string` **always present**&#x20;

        - `fragment` `string` **may be absent**&#x20;

        - `query` `string` **may be absent**&#x20;

        Additional properties: not allowed.

      Additional properties: not allowed.

    - `markdown` `object` **may be absent**&#x20;

      6 properties

      - `path` `string` **always present**&#x20;

        pattern: ^(?:NOTICES\\.txt|(?:content|assets)/(?!\\.{1,2}(?:/|$))\[A-Za-z0-9\_.-]+(?:/(?!\\.{1,2}(?:/|$))\[A-Za-z0-9\_.-]+)\*)$

      - `bytes` `integer` **always present**&#x20;

        minimum: 0

      - `digest` `string` **always present**&#x20;

        pattern: ^\[a-f0-9]{64}$

      - `mediaType` `string` **always present**&#x20;

      - `anchors` `list of object` **always present**&#x20;

        Array items:

        object

        3 properties

        - `id` `string` **always present**&#x20;

        - `exportedId` `string` **always present**&#x20;

        - `title` `string` **may be absent**&#x20;

        Additional properties: not allowed.

      - `links` `list of one of several types` **always present**&#x20;

        Array items:

        The response has exactly one of these shapes:

        **Shape 1** · 6 properties

        object

        6 properties

        - `key` `string` **always present**&#x20;

        - `kind` `enum<string>` **always present**&#x20;

          Available options: `"resource"`

        - `href` `string` **always present**&#x20;

        - `fragment` `string` **may be absent**&#x20;

        - `query` `string` **may be absent**&#x20;

        - `ref` `one of several types` **always present**&#x20;

          The response has exactly one of these shapes:

          **Shape 1** · 2 properties

          object

          2 properties

          - `kind` `string` **always present**&#x20;

            const: "page"

          - `documentId` `string` **always present**&#x20;

            minLength: 1

          Additional properties: not allowed.

          **Shape 2** · 3 properties

          object

          3 properties

          - `kind` `string` **always present**&#x20;

            const: "section"

          - `documentId` `string` **always present**&#x20;

            minLength: 1

          - `sectionId` `string` **always present**&#x20;

            pattern: ^\[a-z0-9]\[a-z0-9-]{0,511}$

          Additional properties: not allowed.

          **Shape 3** · 2 properties

          object

          2 properties

          - `kind` `string` **always present**&#x20;

            const: "snippet"

          - `id` `string` **always present**&#x20;

            pattern: ^\[A-Za-z\_]\[A-Za-z0-9\_.-]\*$

          Additional properties: not allowed.

        Additional properties: not allowed.

        **Shape 2** · 6 properties

        object

        6 properties

        - `key` `string` **always present**&#x20;

        - `kind` `enum<string>` **always present**&#x20;

          Available options: `"asset"`

        - `href` `string` **always present**&#x20;

        - `fragment` `string` **may be absent**&#x20;

        - `query` `string` **may be absent**&#x20;

        - `asset` `string` **always present**&#x20;

          pattern: ^(?:NOTICES\\.txt|(?:content|assets)/(?!\\.{1,2}(?:/|$))\[A-Za-z0-9\_.-]+(?:/(?!\\.{1,2}(?:/|$))\[A-Za-z0-9\_.-]+)\*)$

        Additional properties: not allowed.

        **Shape 3** · 5 properties

        object

        5 properties

        - `key` `string` **always present**&#x20;

        - `kind` `enum<string>` **always present**&#x20;

          Available options: `"canonical"`, `"external"`

        - `href` `string` **always present**&#x20;

        - `fragment` `string` **may be absent**&#x20;

        - `query` `string` **may be absent**&#x20;

        Additional properties: not allowed.

      Additional properties: not allowed.

    Additional properties: not allowed.

  - `assets` `list of string` **always present**&#x20;

    uniqueItems: true

    Array items:

    string; pattern: ^(?:NOTICES\\.txt|(?:content|assets)/(?!\\.{1,2}(?:/|$))\[A-Za-z0-9\_.-]+(?:/(?!\\.{1,2}(?:/|$))\[A-Za-z0-9\_.-]+)\*)$

  - `externalDependencies` `list of object` **always present**&#x20;

    Array items:

    object

    2 properties

    - `url` `string` **always present**&#x20;

      format: uri

    - `kind` `string` **always present**&#x20;

      const: "image"

    Additional properties: not allowed.

  - `ref` `one of several types` **always present**&#x20;

    The response has exactly one of these shapes:

    **Shape 1** · 2 properties

    object

    2 properties

    - `kind` `string` **always present**&#x20;

      const: "page"

    - `documentId` `string` **always present**&#x20;

      minLength: 1

    Additional properties: not allowed.

    **Shape 2** · 3 properties

    object

    3 properties

    - `kind` `string` **always present**&#x20;

      const: "section"

    - `documentId` `string` **always present**&#x20;

      minLength: 1

    - `sectionId` `string` **always present**&#x20;

      pattern: ^\[a-z0-9]\[a-z0-9-]{0,511}$

    Additional properties: not allowed.

    **Shape 3** · 2 properties

    object

    2 properties

    - `kind` `string` **always present**&#x20;

      const: "snippet"

    - `id` `string` **always present**&#x20;

      pattern: ^\[A-Za-z\_]\[A-Za-z0-9\_.-]\*$

    Additional properties: not allowed.

  - `source` `object` **may be absent**&#x20;

    minProperties: 1

    3 properties

    - `documentId` `string` **may be absent**&#x20;

      minLength: 1

    - `snippetId` `string` **may be absent**&#x20;

      minLength: 1

    - `valuesDigest` `string` **may be absent**&#x20;

      pattern: ^\[a-f0-9]{64}$

    Additional properties: not allowed.

  Additional properties: not allowed.

Additional properties: not allowed.

##### Example: Illustrative content; discover keys and revision from your own host.

Key: illustrative. Location: response 200; application/json. Authored in OpenAPI.

```json
{
  "schemaVersion": 1,
  "revision": "0770e6d70db51967fac8dcc7bb4ff5a5bff87378eb2e2bbb63dea93d090c82e8",
  "publication": {
    "channel": "production",
    "version": "current",
    "language": "en"
  },
  "key": "k_WyJwYWdlIiwiZ3VpZGUuYmlsbGluZyJd",
  "resource": {
    "ref": {
      "kind": "page",
      "documentId": "guide.billing"
    },
    "publication": {
      "channel": "production",
      "version": "current",
      "language": "en"
    },
    "title": "Billing",
    "summary": "Contact billing support.",
    "type": "guide",
    "representations": {
      "html": {
        "path": "content/resource-example.html",
        "mediaType": "text/html",
        "bytes": 24,
        "digest": "0a97b73701c659be016f97a7be571c14c1cdad440cf79dfc1c8a0238a8b4787f",
        "anchors": [],
        "links": []
      },
      "markdown": {
        "path": "content/resource-example.md",
        "mediaType": "text/markdown",
        "bytes": 17,
        "digest": "d37729e92d86a1133926632326a5d61a3e65610a169d65211726924af02dac5c",
        "anchors": [],
        "links": []
      }
    },
    "assets": [],
    "externalDependencies": []
  }
}
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
