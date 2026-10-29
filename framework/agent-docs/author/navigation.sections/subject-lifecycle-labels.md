---
id: guide.navigation-lifecycle
title: Organize site navigation
summary: Arrange guides, reference pages, and other documents into a clear site menu.
type: how-to
area: appearance
subarea: appearance-navigation
canonical: /author/navigation
---

# Organize site navigation

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Configure and customize > Navigation > Overview

**Updated: 2026-10-29.**

Parent page: [Full Markdown page](/author/navigation.md)

The `navigation` setting controls the site's left menu. It can be a list in `docs.config.yaml` or import a separate YAML file. Add guides, tutorials, concepts, and reference pages by their stable document IDs. Nodes appear in the order you write them.

Each node has a stable `id` for the menu entry. It needs exactly one of these targets:

- `doc` places any page, including a guide or API reference, by its stable document ID.
- `label` with `items` makes a group of pages or nested groups.
- `operation` places an API reference by stable operation ID.
- `generated` fills in API references from the registered OpenAPI source.

The menu follows document IDs rather than file paths or slugs. Moving a source file or changing a page URL does not require a navigation edit. A `doc` node uses the page title by default; set `label` when the menu needs a shorter name. Pages omitted from navigation can still be built and linked from other pages.

## Subject lifecycle labels

Set `subjectLifecycle` to `beta`, `in-development`, `experimental`, or `deprecated` in page frontmatter. Navigation and page headers show a text badge. Markdown and the document manifest carry the same status.

OpenAPI `deprecated: true` marks an endpoint as deprecated and cannot be overridden by an editorial label. The preview layout can also assign a label by source operation ID. Labels communicate maturity; they do not control access.

For a deprecated subject, add [deprecation guidance](https://www.shoalrun.com/author/frontmatter.md) with optional dates, replacement, and migration references. These details appear in the article and Markdown resources; navigation keeps its concise status badge.

See [current limitations](https://www.shoalrun.com/status.md) for the remaining navigation and authoring work.
