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

## `snippets`

A mapping from snippet ID to `{ file, variables }`. Each variable has a `type` (`string`, `number`, or `boolean`) and optional `required`, `default`, and `enum`. See [snippets](https://www.shoalrun.com/author/snippets.md).

A snippet with no variables:

```yaml title="config/snippets.yaml"
legal.beta-notice:
  file: ../snippets/beta-notice.mdx
```

Required and default values:

```yaml title="config/snippets.yaml"
payment.request-prep:
  file: ../snippets/request-prep.mdx
  variables:
    product: { type: string, required: true }
    header: { type: string, default: Idempotency-Key }
```

A value limited to a list, and a number:

```yaml title="config/snippets.yaml"
limits.rate:
  file: ../snippets/rate-limit.mdx
  variables:
    plan: { type: string, enum: [free, team, enterprise], default: free }
    perMinute: { type: number, required: true }
```
