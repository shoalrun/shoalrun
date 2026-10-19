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

## Create or edit a project template

A template is a `.md` or `.mdx` file. It can open with a frontmatter block, then a body. Register it under `templates` in `docs.config.yaml` or an included config file. For example, include a mapping like this under `templates` to override the built-in API reference:

```yaml title="docs.config.yaml"
templates:
  api-reference:
    type: api-reference
    body: ./templates/api-reference.mdx
    required: [operations]
```

The template ID is `api-reference`. `type` becomes the new page's frontmatter type. `body` is resolved relative to the config file that declares it. Add `required: [operations]` only when every page from this template must name a known, stable API operation ID. No other `required` fields are supported yet.

### Write the frontmatter

Start the file with `---`, your fields and `#` comments, and a closing `---`. Scaffold keeps your comments and any extra fields. It sets the fields it owns:

- `id`, `title`, `summary`, `slug`, and `type`.
- `channel`, `version`, and `language`.
- `operations`, when you pass `--operation`. Without it, scaffold removes an `operations` line from the template.
- `access`, which is always `draft`.

List an owned field in the template to attach a comment to it. Scaffold replaces the value and keeps the comment. A field the template omits is added at the end.

Three rules keep the output valid:

- Quote placeholder values in the frontmatter. An unquoted value that starts with two square brackets is read as a YAML list.
- Use only placeholder values that pass validation in every project. Comment out fields such as `audiences`, `readerFilters`, and `subjectLifecycle`, because a wrong value fails the draft build.
- Keep nested fields in flow style, such as `card: { icon: book-open }`. A comment block after a nested block mapping is indented with it and cannot be uncommented in place.

Frontmatter comments do not reach the published page, so they never appear in the Markdown twin.

### Write the body

Write each prompt for the facts and checks an author must supply as a placeholder: `[[TODO:`, the prompt text, then two closing square brackets. Do not use braces, angle brackets, or two closing square brackets inside a placeholder, because the MDX parser and the placeholder check read them. A public page fails the build while a complete placeholder remains in its body or frontmatter, or while its summary still starts with `Draft guide for `. Ordinary Markdown and the supported [components](https://www.shoalrun.com/author/components.md) can appear in the body.

Each placeholder should say what to write, the length or format limit, and an example. For an optional section, start the prompt with `OPTIONAL SECTION` and say when to keep it. The unresolved placeholder forces the author to keep the section or delete it.

To make a new template, copy and edit a template file, then add another entry with a distinct ID. To change an existing template, edit its file or mapping and run `scaffold` again to inspect a new draft. Use the same ID as a built-in template, such as `guide`, to replace it for this project. Existing pages are never rewritten.

Set the page's frontmatter `updated` to the current date in `YYYY-MM-DD` format when you create or edit it. Preserve its original `date` if present.
