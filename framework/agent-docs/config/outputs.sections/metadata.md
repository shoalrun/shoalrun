---
id: reference.config-outputs
title: Output and export settings
summary: Configure metadata providers, application exports, Markdown headers,
  and discovery indexes.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config/outputs
---

# Output and export settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference > Output and export

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/config/outputs.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Learn how files combine and how to validate configuration changes.

Configure metadata providers, application exports, Markdown headers, and discovery indexes. These keys belong in `docs.config.yaml` or an included configuration file. For file composition and validation commands, see [Configure your project](https://www.shoalrun.com/configuration.md). Use the [configuration index](https://www.shoalrun.com/config.md) to find another setting.

## `metadata`

`metadata.provider.module` names an optional local module that exports `provideMetadata(context)`. The module can supply owned page fields to the build. The framework does not run an external vocabulary validator or publish supplied fields automatically. See [custom metadata](https://www.shoalrun.com/author/custom-metadata.md) for the return shape and ownership rule.

```yaml title="docs.config.yaml"
metadata:
  provider:
    module: ./metadata/provider.mjs
```

The path is relative to the config file that declares it. `provider` accepts only `module`.
