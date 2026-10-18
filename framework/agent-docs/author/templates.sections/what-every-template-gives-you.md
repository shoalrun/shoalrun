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

## What every template gives you

The primary Diátaxis templates use these authoring conventions; workflow templates keep the sections useful to their role:

- **Commented frontmatter.** Comments explain fields and give examples where useful. Fields you must fill in hold a placeholder. Optional fields are commented out, each with the case where it applies.
- **A short introduction.** One paragraph of 150 words or fewer sits under the title with no heading. It says what the page is for and who it is for.
- **Optional sections.** Sections such as Prerequisites and Considerations are marked optional. Keep the ones that apply and delete the rest, heading and text.
- **Structure for the reader need.** Tutorials guide an exercise, how-tos put actions and verification first, references organize facts for lookup, and explanations develop context and reasoning.
- **HTML, Markdown, and agents.** Keep this section when the page uses a component or describes behavior that differs between HTML and Markdown or affects what an agent reads. State what HTML shows, what the Markdown twin contains, and what an agent receives. Delete it otherwise.
- **Related reading.** A `RelatedReading` block ends the page. Declare the relationships in config, or delete the section if no page relates to this one. The `api-reference` template has no such block, because the build adds related lists after the generated details.
