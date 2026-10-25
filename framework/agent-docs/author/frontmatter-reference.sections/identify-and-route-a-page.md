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

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Metadata > Generated frontmatter reference

**Updated: 2026-10-25.**

Parent page: [Full Markdown page](/author/frontmatter-reference.md)

This is the field inventory for this documentation site. The tables below are built from Shoalrun's native field definitions and this site's `frontmatter.fields` declarations on each build. They describe source page headers, not the shorter YAML header selected for a published Markdown page.

`agent.intent` in the project-defined table is an optional string. This site's authors use it to describe the task a page helps an agent complete. It is **not** a required Shoalrun field or an instruction to an agent. `editorial.reviewNote` is another site-specific field for internal review notes. A different project can declare different fields.

To publish an equivalent inventory on your site, place `<FrontmatterReference />` on a page. It takes no attributes or child content and renders the current project's native and declared fields in HTML and Markdown.

## Identify and route a page

Use the page ID for links and cards that should survive a URL change. The slug supplies the page part of the URL; publication prefixes may be added around it. Summary is short preview text; description is a separate, optional fuller account. Project output rules choose which field supplies each surface.

| Field         | Type   | Needed            | What it changes                                                                              |
| ------------- | ------ | ----------------- | -------------------------------------------------------------------------------------------- |
| `id`          | string | On each page      | Stable page identity used by document links and cards; keep it when the file or URL changes. |
| `title`       | string | After inheritance | Page heading and default browser title.                                                      |
| `summary`     | string | After inheritance | Short page preview, used by cards and other configured text surfaces.                        |
| `description` | string | Optional          | Fuller description of what the page covers; kept distinct from the short summary.            |
| `type`        | string | After inheritance | Document kind, such as guide or api-reference; can select a Markdown metadata profile.       |
| `slug`        | string | On each page      | Page URL path before channel, version, and language prefixes.                                |
