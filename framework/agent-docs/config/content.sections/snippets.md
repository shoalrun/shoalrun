---
id: reference.config-content
title: Authoring and content settings
summary: Configure authoring guidance, page defaults, reusable content, reading
  paths, and reader views.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config/content
---

# Authoring and content settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Configuration reference > Authoring and content

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/config/content.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Learn how files combine and how to validate configuration changes.

Configure authoring guidance, page defaults, reusable content, reading paths, and reader views. These keys belong in `docs.config.yaml` or an included configuration file. For file composition and validation commands, see [Configure your project](https://www.shoalrun.com/configuration.md). Use the [configuration index](https://www.shoalrun.com/config.md) to find another setting.

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
