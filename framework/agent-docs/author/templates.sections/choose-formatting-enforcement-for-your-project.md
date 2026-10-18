---
id: guide.templates
title: Templates
summary: Create and edit page starting points, then scaffold drafts from them.
type: reference
audiences:
  - authors
canonical: /author/templates
---

# Templates

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Templates

**Updated: 2026-10-17.**

Parent page: [Full Markdown page](/author/templates.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Page metadata](https://www.shoalrun.com/author/frontmatter.md) — Know which fields a new page needs before you pre-fill them.

A template supplies the starting page for a new one: commented frontmatter and a body of prompts. It tells authors and agents what to write, in what order, and what to delete. `scaffold` copies the template once and fills in the draft fields. The result is an ordinary page that authors can change. Editing a template later affects future drafts, not pages already scaffolded.

Use a [snippet](https://www.shoalrun.com/author/snippets.md) when the same prose must stay shared across several pages. Templates guide the initial draft; they do not enforce a permanent page structure.

## Choose formatting enforcement for your project

A template supplies a starting outline. It does not impose that outline on completed pages. Project overrides replace the scaffold; they do not silently change your lint policy.

This repository checks authored page formatting with `npm run docs:format`. Its `.vale-format.ini` enables project-owned `DocShape` rules. Errors cover title and summary lengths, body headings, introductions, and `updated` dates. Type-boundary warnings flag possible digressions for editorial review. A passing check does not prove a page serves its reader's need.

The structural rules use [Vale's embedded Tengo scripting language](https://docs.vale.sh/checks/script) to read source frontmatter and headings. Tengo runs inside Vale during linting; it needs no separate installation and is not part of the published site. The scripts live under `.vale/styles/config/scripts/` in this repository.

`DocShape.RecipeShape` requires nonempty setup, action, and final success-check sections. It accepts directly authored recipes without an Ingredients list and assembled recipes with task-specific action headings. `DocShape.IngredientShape` accepts either Inputs, Action, Output, and Check it worked sections or a compact body with `workflow` handoff metadata and a declared `check`. These are this repository's conventions. `recipe draft` validates YAML values and handoff order; Vale checks structure and does not run the instructions or prove the stated outcome.

Both scripts ignore headings inside fenced code examples. Setup headings can be Before you start, Before you begin, Prerequisites, or What you need. Success headings can be Check it worked, Check the outcome, Check the result, Verify the outcome, or Verify the result. Alternate outlines and YAML forms may need a project-adapted script. Keep compact workflow declarations as ordinary block or flow mappings for this policy.

Use your own Vale config when a custom template needs different conventions. Vale can change a rule's severity or disable it. For example:

```ini title=".vale-format.ini"
[*.{md,mdx}]
BasedOnStyles = DocShape
DocShape.TypeBoundary = NO
DocShape.TitleLength = warning
DocShape.RecipeShape = warning
DocShape.IngredientShape = NO
```

For a different title length, create a project rule with the desired `max` and disable the original. For different introduction or section conventions, adapt the project script rules. Keep the chosen config with your templates and run that same policy locally and in CI.

To include your policy in `shoalrun check`, register its command under `audit.tests`. Paths are relative to the docs config directory:

```yaml
audit:
  tests:
    - id: formatting
      run: [vale, --config=../.vale-format.ini, content]
```

Vale must be installed when you configure that command. The CLI does not require Vale for other projects or derive rules from template text. Compiler checks for valid source, links, and unresolved public draft prompts still apply independently. See [audit settings](https://www.shoalrun.com/publish/audit.md) and [writing guides](https://www.shoalrun.com/author/design-writing-guides.md).
