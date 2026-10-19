---
id: guide.custom-components.react
title: Data-driven React components
summary: Follow local data through a component plugin, shared documentation, and
  a React calculator.
type: explanation
area: components
subarea: components-custom
canonical: /author/components/custom/react
---

# Data-driven React components

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Custom components > Data-driven React components

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/author/components/custom/react.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Custom components](https://www.shoalrun.com/author/components/custom.md) — Start with a small component whose content stays in MDX.

Use a declared data file when a component needs to generate tables, calculations, or other structured documentation. This advanced example adds data and generated explanations to the [small CopyText example](https://www.shoalrun.com/author/components/custom.md). A data file is optional; ordinary component text can stay in MDX.

## Registration

Add registrations to your project configuration:

```yaml
components:
  - ./components/retry-budget/components.json
```

The manifest declares the build module, browser source, and styles relative to the package. Shoalrun compiles the module graph and includes imported JSON and shared functions in dependency tracking. The build module imports `policy.json`; there is no separate `files` registration.
