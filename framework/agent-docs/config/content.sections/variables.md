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

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference > Authoring and content

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/config/content.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Learn how files combine and how to validate configuration changes.

Configure authoring guidance, page defaults, reusable content, reading paths, and reader views. These keys belong in `docs.config.yaml` or an included configuration file. For file composition and validation commands, see [Configure your project](https://www.shoalrun.com/configuration.md). Use the [configuration index](https://www.shoalrun.com/config.md) to find another setting.

## `variables`

A mapping of project-wide values for [snippets](https://www.shoalrun.com/author/snippets.md). They override snippet defaults and are overridden by page `variables` and invocation values. Values are strings, numbers, or booleans.

```yaml title="docs.config.yaml"
variables:
  product: Payments
  supportEmail: support@example.com
  retryLimit: 3
  betaFeatures: false
```

A page overrides a project value for itself:

```yaml title="content/sandbox-guide.mdx (frontmatter)"
variables:
  product: Payments sandbox
```

A single include overrides both:

```mdx title="content/sandbox-guide.mdx"
<Snippet id="payment.request-prep" values={{ product: "Payments test mode" }} />
```
