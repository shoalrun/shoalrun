---
id: guide.custom-metadata
title: Metadata customization
summary: Defaults, enforcement, custom field declarations, text selection, and
  provider contracts.
type: reference
area: authoring
subarea: authoring-metadata
canonical: /author/custom-metadata
---

# Metadata customization

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Metadata > Metadata customization

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/author/custom-metadata.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md) — Choose which eligible project fields to publish.

Use this guide when your project needs shared metadata rules or fields beyond the [native page metadata](https://www.shoalrun.com/author/frontmatter.md). To choose which values appear in published Markdown, see [Markdown metadata](https://www.shoalrun.com/author/markdown-metadata.md).

## Preview changes to metadata providers

Restart local preview after editing a custom metadata provider module configured with `metadata.provider`. Node loads the module once, so a watched rebuild does not reload its implementation. Stop `shoalrun dev` and start it again to see changes to the provider code. Changes to ordinary documentation pages still trigger automatic rebuilds. See the [CLI reference](https://www.shoalrun.com/cli.md) for other changes that require a restart.
