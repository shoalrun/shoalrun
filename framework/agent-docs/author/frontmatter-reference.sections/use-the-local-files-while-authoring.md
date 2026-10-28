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

## Use the local files while authoring

Every project also gets `.shoalrun/frontmatter-reference.md` and `.shoalrun/frontmatter.schema.json` beside `docs.config.yaml`. They contain that project's inventory for authors, editors, and agents working in its repository. For this site, the paths are `docs/.shoalrun/frontmatter-reference.md` and `docs/.shoalrun/frontmatter.schema.json`. These internal files are not published site routes.

Changing a declaration and rebuilding updates the published table and both local files. Undeclared fields may still appear in source pages, but they have no project type check and do not appear in the field inventory.
