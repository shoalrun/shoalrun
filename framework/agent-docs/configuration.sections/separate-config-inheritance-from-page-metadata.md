---
id: guide.configuration
title: Organize project configuration
summary: Learn how Shoalrun resolves config files, layers presets, tracks path
  origins, and applies page defaults before building publications.
type: how-to
area: publishing
subarea: publishing-configuration
canonical: /configuration
---

# Organize project configuration

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Configure and customize > Configure your project

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/configuration.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Build separate sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md) — Reuse shared configuration and content for separately selected sites.

`docs.config.yaml` connects your content, presentation, and publication settings. Start with one file, then extract sections or share defaults when several projects need them. This guide explains how those choices interact and how to inspect the result.

Use the [configuration reference](https://www.shoalrun.com/config.md) to look up individual fields. Use [example projects](https://www.shoalrun.com/config/examples.md) for complete configurations you can copy.

## Separate config inheritance from page metadata

The loader first combines all configured `frontmatter` sections using the config merge rules. It then resolves each page using:

```text
frontmatter.defaults → page frontmatter → frontmatter.enforced
```

Mappings merge recursively and lists replace at this stage too. Config directives such as `$include`, `$concat`, and `$remove` are not page-frontmatter inheritance instructions.

For example, `frontmatter.defaults.access.policy: public` lets a page set itself to `draft`. Setting `frontmatter.enforced.access.policy: public` overrides that draft choice. Use defaults when authors should control publication access.

`frontmatter.fields` declares field types and requirements; it does not fill in missing values. A metadata provider is an additional advanced input to page resolution. See [page metadata](https://www.shoalrun.com/author/frontmatter.md) and the [configuration reference](https://www.shoalrun.com/config.md) before adding one.

### Publication defaults serve a different purpose

`publications.defaults` identifies default publication choices, including which channel and version receive an API's top-level source. It also supplies defaults for scaffolding and API selection. The default language supplies a page language when one is missing.

Existing authored pages still need resolved channel and version fields. The starter provides these through `frontmatter.defaults`. Do not assume that changing `publications.defaults.version` also changes every page's metadata.

`publications.enabled` selects combinations to build; it does not clone pages into those combinations. Navigation and `doc:` links resolve against the selected publication. See [versions and languages](https://www.shoalrun.com/publish/publications.md) for complete variant and route examples.
