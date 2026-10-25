---
id: reference.config
title: Configuration reference
summary: Configuration settings, defaults, validation rules, and related guides.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config
---

# Configuration reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference

**Updated: 2026-10-24.**

Parent page: [Full Markdown page](/config.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [How Shoalrun works](https://www.shoalrun.com/concepts.md) — Understand publications, stable IDs, and config composition before changing settings.

A project's config starts at `docs.config.yaml`. The CLI looks for that name by default, and `shoalrun scaffold -n` searches parent directories for it. For the configuration workflow, composition rules, and debugging, start with [configure your project](https://www.shoalrun.com/configuration.md). This page lists every top-level key. Keys with a dedicated guide link there for the full rules. For complete, working configs, see [example configs](https://www.shoalrun.com/config/examples.md).

The root file must be a YAML mapping with `schemaVersion: 1`. YAML is parsed strictly: duplicate keys fail. Any top-level key not listed here fails with `unknown setting <key>`. Keys nested inside `site`, `apis`, `publications`, and `outputs` are not all checked yet, so check spelling there carefully.

```yaml title="docs.config.yaml"
schemaVersion: 1
site:
  title: Example documentation
publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }
navigation: { $include: ./config/nav.yaml }
```

## `apis`

A mapping from API ID to its source and operations. See [API references](https://www.shoalrun.com/publish/api-references.md) and [focused contracts](https://www.shoalrun.com/api-docs/focused-contracts.md).

| Key                         | Meaning                                                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source.kind`               | Must be `file`.                                                                                                                                                                                                                                    |
| `source.path`               | Local OpenAPI 3.0 or 3.1 file, relative to the declaring config file.                                                                                                                                                                              |
| `source.focused`            | `true` writes a [focused contract](https://www.shoalrun.com/api-docs/focused-contracts.md) for each reference page.                                                                                                                                |
| `source.publish`            | `true` publishes the full source file, which must end in `.yaml`, `.yml`, or `.json`. Also turns on focused contracts.                                                                                                                             |
| `publicReview.digest`       | Required SHA-256 review digest when API content appears on a public page or in a focused contract. Generate a candidate with `shoalrun api review <config> --output <local-directory>`, inspect it, then pin the reported digest.                  |
| `discovery.endpoint`        | Public HTTPS API URL for `/.well-known/api-catalog`. Needs `source.publish` and `site.origin`.                                                                                                                                                     |
| `operations`                | A list of `{ id, sourceOperationId, reference }` bindings. Stable IDs are unique across all APIs.                                                                                                                                                  |
| `publications`              | A list of `{ channel, version, source, discovery }` entries for publications other than the default.                                                                                                                                               |
| `generateReferences`        | `true`, or `{ pathPrefix, include }` or `{ pathPrefix, exclude }`. `pathPrefix` defaults to `/reference/<apiId>`.                                                                                                                                  |
| `mappings.subjectLifecycle` | Explicitly map an operation-level `x-*` scalar or dotted property to `beta`, `in-development`, `experimental`, or `deprecated`. See [OpenAPI extension mappings](https://www.shoalrun.com/publish/openapi-extension-mappings.md).                  |
| `querySyntax`               | Opt-in rules for a placeholder query parameter whose filter expressions go directly in the URL. Each rule has `parameter`, `pathPrefixes`, `style: unwrapped`, and `example`. See [API generation](https://www.shoalrun.com/api-docs/generate.md). |

One authored reference page for one operation. The spec stays private:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/openapi.yaml }
  operations:
    - id: payments.create
      sourceOperationId: createPayment
      reference: reference.create-payment
```

Publish the spec, a focused contract per page, and the API catalog. This also needs `site.origin`:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/openapi.yaml, publish: true }
  discovery:
    endpoint: https://api.example.com
  operations:
    - { id: payments.create, sourceOperationId: createPayment, reference: reference.create-payment }
```

Keep the spec private but publish focused contracts:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/openapi.yaml, focused: true }
  operations:
    - { id: payments.create, sourceOperationId: createPayment, reference: reference.create-payment }
```

Generate reference pages for every operation except two:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/openapi.yaml }
  generateReferences:
    pathPrefix: /api-reference/payments
    exclude: [internalReconcile, debugEcho]
```

Give the v2 publication its own spec. The top-level `source` covers the default publication:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/v1.yaml }
  publications:
    - channel: production
      version: v2
      source: { kind: file, path: ../apis/payments/v2.yaml, publish: true }
  operations:
    - { id: payments.create, sourceOperationId: createPayment, reference: reference.create-payment }
```
