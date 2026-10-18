---
id: guide.what-is-shoalrun
title: What is Shoalrun?
summary: A one-page introduction to Shoalrun's document-first approach, its
  outputs, and the current prototype.
type: overview
canonical: /what-is-shoalrun
---

# What is Shoalrun?

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > What is Shoalrun?

**Updated: 2026-10-14.**

Shoalrun is a documentation compiler for product and API docs. It reads project configuration, Markdown and supported MDX pages, and optional local OpenAPI files. From those sources, it builds a site for people and readable Markdown pages for agents. The normal build is deterministic: it makes no model calls or network requests.

## Documents have an identity

In Shoalrun, a document is more than a file at a path. It has a stable ID, metadata, and relationships to other documents. Navigation, page cards, and links can refer to that ID. You can move a source file without reconnecting those parts of the site. The published URL is a separate choice: changing a page's slug changes its URL and may need a redirect.

That identity lets information connect across the site. A guide can link to an exact API operation, a related page, or a complete workflow without relying on where its source file lives.

## One source serves different readers

Shoalrun builds HTML and a Markdown twin from the same accepted content. Browser components can give people tabs, diagrams, and other ways to explore an idea; their Markdown form keeps the useful content readable without browser scripts. Authors can also write a section for just one output when people and agents need different explanations. The build publishes a document manifest and discovery files so software can find the pages and their relationships.

## Authors control the connections

Shoalrun also supports AI-assisted writing with human review. Use your existing coding agent with project guidance and checked edit tools. [Authoring tools](https://www.shoalrun.com/author/agent-overview.md) provide project-wide discovery and isolated snapshot validation for ordinary working-tree edits. You accept the content, inspect its HTML and Markdown, and decide when to publish. The normal compiler build remains independent of the models.

Project-owned YAML can define navigation, relationships, templates, and API sources in separate files. Shoalrun combines the files and can trace where a setting came from. Public builds check links and publication variants, and changes to imported OpenAPI content require a renewed review digest.

Optional ingredients, recipes, and cookbooks extend the same idea to tasks. An ingredient is a reusable action; a reviewed recipe completes one goal. A cookbook helps readers choose the complete recipes they need.

## Where it stands

The public documentation site shows output built by Shoalrun. The compiler and CLI are still a private prototype and are not available to install. The [project status](https://www.shoalrun.com/status.md) lists implemented capabilities and current limits.

## Related reading

### Next steps

- [How Shoalrun works](https://www.shoalrun.com/concepts.md) — Follow a document through the compiler and see how IDs and routes work.

- [Getting started](https://www.shoalrun.com/start.md) — Follow the getting-started workflow if you have access to the prototype.

### Related topics

- [About Shoalrun](https://www.shoalrun.com/about.md) — Read the author's motivation and design philosophy.
