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

## Choose a publication and visibility

The project enables specific channel/version/language combinations. A page is built only for combinations matching its resolved values. `audiences` and `readerFilters` select reader views when the site config enables them; `access.policy` determines whether the page enters this public build. A draft page is excluded.

| Field           | Type   | Needed      | What it changes                                                                                                                |
| --------------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `channel`       | string | Public page | Publication environment, such as sandbox or production; selects an enabled publication and API source.                         |
| `version`       | string | Public page | API or documentation edition, such as v1; selects an enabled publication and API source.                                       |
| `language`      | string | Optional    | Content language; uses frontmatter defaults/enforced values, then publications.defaults.language, then en.                     |
| `locale`        | string | Optional    | Formatting conventions used in the content; can inherit a project locale for the page language and can be overridden per page. |
| `access`        | object | Public page | Controls whether the page enters a public build; this object is not exported to Markdown metadata.                             |
| `access.policy` | string | With access | Use public to publish this page; draft pages are excluded from the built site.                                                 |
| `audiences`     | array  | Optional    | Readers this page is intended for; does not control who can access it.                                                         |
| `readerFilters` | object | Optional    | Configured reader filter choices for this page. Missing facets are shared.                                                     |

Language is the content language and selects a publication. Locale describes formatting conventions in the content and does not select a publication. `frontmatter.locales` can set a project locale for each language; pages may override it.
