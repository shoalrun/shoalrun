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

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/author/templates.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Page metadata](https://www.shoalrun.com/author/frontmatter.md) — Know which fields a new page needs before you pre-fill them.

A template supplies the starting page for a new one: commented frontmatter and a body of prompts. It tells authors and agents what to write, in what order, and what to delete. `scaffold` copies the template once and fills in the draft fields. The result is an ordinary page that authors can change. Editing a template later affects future drafts, not pages already scaffolded.

Use a [snippet](https://www.shoalrun.com/author/snippets.md) when the same prose must stay shared across several pages. Templates guide the initial draft; they do not enforce a permanent page structure.

## Keep the four shapes distinct

Each template gives the page a different writing purpose and boundary.

| Shape       | Writing boundary                                                                                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tutorial    | Choose one reliable exercise and sample values. Show results early and at each step, offer repetition, and keep explanation brief. Link out for deeper reasoning and alternatives. |
| How-to      | Address the reader's specific goal. Assume practical competence, allow conditional paths for real situations, and link out for background or complete reference facts.             |
| Reference   | Organize facts to mirror the product, with consistent sections and neutral descriptions. Examples illustrate behavior without becoming task walkthroughs.                          |
| Explanation | Develop a bounded topic through context, connections, design reasons, and perspectives. Discuss alternatives and tradeoffs without prescribing a task or cataloging fields.        |

These boundaries are based on Diátaxis's guidance for [tutorials](https://diataxis.fr/tutorials/), [how-to guides](https://diataxis.fr/how-to-guides/), [reference](https://diataxis.fr/reference/), and [explanation](https://diataxis.fr/explanation/). The templates are editable starting points, not a claim that a page conforms merely because its type is set.
