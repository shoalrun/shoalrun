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

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Authoring reference > Templates

**Updated: 2026-10-29.**

Parent page: [Full Markdown page](/author/templates.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Page metadata](https://www.shoalrun.com/author/frontmatter.md) — Know which fields a new page needs before you pre-fill them.

A template supplies the starting page for a new one: commented frontmatter and a body of prompts. It tells authors and agents what to write, in what order, and what to delete. `scaffold` copies the template once and fills in the draft fields. The result is an ordinary page that authors can change. Editing a template later affects future drafts, not pages already scaffolded.

Use a [snippet](https://www.shoalrun.com/author/snippets.md) when the same prose must stay shared across several pages. Templates guide the initial draft; they do not enforce a permanent page structure.

## Built-in templates

These ship with the CLI and require no `templates` configuration. Their names are available in every project unless a project overrides them.

| Template      | Page type     | Use it for                                                                            |
| ------------- | ------------- | ------------------------------------------------------------------------------------- |
| `tutorial`    | `tutorial`    | Learn by following one guided exercise that builds something. Built in.               |
| `how-to`      | `how-to`      | Complete a specific task from a known starting state and verify the result. Built in. |
| `reference`   | `reference`   | Look up exact syntax, fields, options, errors, and limits. Built in.                  |
| `explanation` | `explanation` | Understand a concept, its context, design choices, and tradeoffs. Built in.           |

The four primary built-in templates are inspired by the [Diátaxis documentation framework](https://diataxis.fr/): tutorial, how-to, reference, and explanation. Choose by the reader's need. A tutorial teaches through a controlled exercise; a how-to helps someone accomplish their own task; reference supplies facts; explanation develops understanding.

The older `guide` and `troubleshooting` templates remain available for compatibility. Existing pages keep their types, IDs, and routes. Shoalrun also includes feature templates for recipes, ingredients, and cookbooks, described below.
