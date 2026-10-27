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

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/author/templates.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Page metadata](https://www.shoalrun.com/author/frontmatter.md) — Know which fields a new page needs before you pre-fill them.

A template supplies the starting page for a new one: commented frontmatter and a body of prompts. It tells authors and agents what to write, in what order, and what to delete. `scaffold` copies the template once and fills in the draft fields. The result is an ordinary page that authors can change. Editing a template later affects future drafts, not pages already scaffolded.

Use a [snippet](https://www.shoalrun.com/author/snippets.md) when the same prose must stay shared across several pages. Templates guide the initial draft; they do not enforce a permanent page structure.

## Scaffold a page

Use a built-in template, or a template registered by your project. From the project directory, with `@shoalrun/cli` installed as in the [quickstart](https://www.shoalrun.com/start.md):

```sh
npx --no-install shoalrun scaffold how-to -n content/track-parcel.mdx
```

Follow [create a page](https://www.shoalrun.com/author/add-page.md) to complete the draft, review it, set public access, and add it to navigation. Register a custom template only when your project needs a different starting structure.

The built-in `api-reference` template needs `--operation`. To scaffold from it, run this form from your documentation project after [registering the operation](https://www.shoalrun.com/publish/api-references.md):

```sh
npx --no-install shoalrun scaffold api-reference docs.config.yaml content/new-operation.mdx \
  --id reference.new --title 'New operation' --summary 'Create a thing.' --slug /reference/new \
  --operation notes.create
```

Both forms write explicit channel, version, language, and draft access, and refuse to overwrite a file. The [API generation guide](https://www.shoalrun.com/api-docs/generate.md) explains reference templates that avoid duplicating spec facts.
