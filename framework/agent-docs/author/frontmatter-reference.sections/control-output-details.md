---
id: guide.frontmatter-reference
title: Frontmatter field reference
summary: Browse the built-in and project-defined page fields this site supports.
type: reference
area: authoring
subarea: authoring-metadata
canonical: /author/frontmatter-reference
---

# Frontmatter field reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Page metadata > Generated frontmatter reference

**Updated: 2026-10-28.**

Parent page: [Full Markdown page](/author/frontmatter-reference.md)

This is the field inventory for this documentation site. The tables below are built from Shoalrun's native field definitions and this site's `frontmatter.fields` declarations on each build. They describe source page headers, not the shorter YAML header selected for a published Markdown page.

`agent.intent` in the project-defined table is an optional string. This site's authors use it to describe the task a page helps an agent complete. It is **not** a required Shoalrun field or an instruction to an agent. `editorial.reviewNote` is another site-specific field for internal review notes. A different project can declare different fields.

To publish an equivalent inventory on your site, place `<FrontmatterReference />` on a page. It takes no attributes or child content and renders the current project's native and declared fields in HTML and Markdown.

For section exports, declare `standaloneSections` with `{ id, context: section }` objects after reviewing each section without its page introduction. Older heading-title strings remain supported for contextual discovery. See [section identity and compatibility](https://www.shoalrun.com/content-delivery/sections.md) before changing an existing declaration.

## Control output details

`seo` changes the browser title or HTML meta description. `displayText` overrides the text chosen for one output surface on this page. `variables` supplies values to registered snippets before they expand into the page body. `markdownMetadata` selects or overrides the YAML preamble of the generated Markdown twin—the machine-readable copy of this page. That generated preamble is separate from the source frontmatter shown above.

| Field              | Type             | Needed   | What it changes                                                                             |
| ------------------ | ---------------- | -------- | ------------------------------------------------------------------------------------------- |
| `seo`              | object           | Optional | Page-level HTML title, description, and indexing settings.                                  |
| `seo.title`        | string           | Optional | Overrides the HTML title; defaults to page title.                                           |
| `seo.description`  | string           | Optional | Overrides the HTML meta description; defaults to page summary.                              |
| `seo.noindex`      | boolean          | Optional | If true, adds a noindex directive and excludes this public page from the XML sitemap.       |
| `displayText`      | object           | Optional | Per-page text overrides for configured presentation surfaces; not exported as metadata.     |
| `variables`        | object           | Optional | Page values supplied to registered snippets; expanded snippet text appears in both outputs. |
| `markdownMetadata` | string or object | Optional | Selects a configured profile or overrides this page’s Markdown YAML preamble.               |
