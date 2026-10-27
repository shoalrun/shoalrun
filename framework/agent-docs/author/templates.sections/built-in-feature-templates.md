---
id: guide.templates
title: Templates
summary: Create and edit page starting points, then scaffold drafts from them.
type: reference
area: authoring
subarea: authoring-templates
audiences:
  - authors
canonical: /author/templates
---

# Templates

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Templates

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/author/templates.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Page metadata](https://www.shoalrun.com/author/frontmatter.md) — Know which fields a new page needs before you pre-fill them.

A template supplies the starting page for a new one: commented frontmatter and a body of prompts. It tells authors and agents what to write, in what order, and what to delete. `scaffold` copies the template once and fills in the draft fields. The result is an ordinary page that authors can change. Editing a template later affects future drafts, not pages already scaffolded.

Use a [snippet](https://www.shoalrun.com/author/snippets.md) when the same prose must stay shared across several pages. Templates guide the initial draft; they do not enforce a permanent page structure.

## Built-in feature templates

These also ship with the CLI and need no project registration. They support Shoalrun's API and workflow features rather than adding new Diátaxis categories. A recipe is a specialized how-to; an ingredient is reusable source for an action or check; a cookbook helps readers choose complete recipes.

| Template        | Page type       | Use it for                                                                                                                                                                                                   |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api-reference` | `api-reference` | The authored text above a generated operation page. Built in; requires exactly one known operation ID.                                                                                                       |
| `recipe`        | `recipe`        | A complete task page with instructions and a final success check; it can be written directly or assembled from ingredients. Built in; see [recipe drafts](https://www.shoalrun.com/author/recipe-drafts.md). |
| `ingredient`    | `ingredient`    | Reusable source instructions for one action or check, copied into recipe drafts. Built in; see [recipe drafts](https://www.shoalrun.com/author/recipe-drafts.md).                                            |
| `cookbook`      | `cookbook`      | An authored page that lists complete recipe pages or offers them in a chooser. Built in; see [recipe drafts](https://www.shoalrun.com/author/recipe-drafts.md).                                              |

```sh
shoalrun scaffold recipe -n content/track-parcel.mdx
shoalrun scaffold ingredient -n content/lookup-parcel.mdx
shoalrun scaffold cookbook -n content/parcel-workflows.mdx
```

A recipe can be written directly; ingredients and composition specs are optional. An ingredient can declare `workflow` metadata for handoff checks during `recipe draft`. A cookbook can use ordinary document links or the configured chooser.
