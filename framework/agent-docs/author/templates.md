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

## Project-added templates

Project templates are named entries under `templates` in config. They are available only in projects that register them; installing the CLI does not provide these names. Use a custom name to add an outline, or a built-in name to override its starting content.

A project template with the same name as a built-in takes precedence. For example, registering `how-to` replaces its starting outline in that project. Use a distinct name to add a choice instead. Neither registration nor overriding rewrites existing pages.

## Keep the four shapes distinct

Each template gives the page a different writing purpose and boundary.

| Shape       | Writing boundary                                                                                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tutorial    | Choose one reliable exercise and sample values. Show results early and at each step, offer repetition, and keep explanation brief. Link out for deeper reasoning and alternatives. |
| How-to      | Address the reader's specific goal. Assume practical competence, allow conditional paths for real situations, and link out for background or complete reference facts.             |
| Reference   | Organize facts to mirror the product, with consistent sections and neutral descriptions. Examples illustrate behavior without becoming task walkthroughs.                          |
| Explanation | Develop a bounded topic through context, connections, design reasons, and perspectives. Discuss alternatives and tradeoffs without prescribing a task or cataloging fields.        |

These boundaries are based on Diátaxis's guidance for [tutorials](https://diataxis.fr/tutorials/), [how-to guides](https://diataxis.fr/how-to-guides/), [reference](https://diataxis.fr/reference/), and [explanation](https://diataxis.fr/explanation/). The templates are editable starting points, not a claim that a page conforms merely because its type is set.

## What every template gives you

The primary Diátaxis templates use these authoring conventions; workflow templates keep the sections useful to their role:

- **Commented frontmatter.** Comments explain fields and give examples where useful. Fields you must fill in hold a placeholder. Optional fields are commented out, each with the case where it applies.
- **A short introduction.** One paragraph of 150 words or fewer sits under the title with no heading. It says what the page is for and who it is for.
- **Optional sections.** Sections such as Prerequisites and Considerations are marked optional. Keep the ones that apply and delete the rest, heading and text.
- **Structure for the reader need.** Tutorials guide an exercise, how-tos put actions and verification first, references organize facts for lookup, and explanations develop context and reasoning.
- **HTML, Markdown, and agents.** Keep this section when the page uses a component or describes behavior that differs between HTML and Markdown or affects what an agent reads. State what HTML shows, what the Markdown twin contains, and what an agent receives. Delete it otherwise.
- **Related reading.** A `RelatedReading` block ends the page. Declare the relationships in config, or delete the section if no page relates to this one. The `api-reference` template has no such block, because the build adds related lists after the generated details.

## Scaffold a page

Use a built-in template, or a template registered by your project. From the project directory, with `SHOALRUN_CLI` set as in the [quickstart](https://www.shoalrun.com/start.md):

```sh
node "$SHOALRUN_CLI" scaffold how-to -n content/track-parcel.mdx
```

Follow [create a page](https://www.shoalrun.com/author/add-page.md) to complete the draft, review it, set public access, and add it to navigation. Register a custom template only when your project needs a different starting structure.

The built-in `api-reference` template needs `--operation`. To scaffold from it, run this explicit form from the **repository root**:

```sh
node framework/dist/cli.js scaffold api-reference docs/docs.config.yaml docs/content/new-operation.mdx \
  --id reference.new --title 'New operation' --summary 'Create a thing.' --slug /reference/new \
  --operation notes.create
```

Both forms write explicit channel, version, language, and draft access, and refuse to overwrite a file. The [API generation guide](https://www.shoalrun.com/api-docs/generate.md) explains reference templates that avoid duplicating spec facts.

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

## Short CLI and derived values

From a project directory, use the package's `shoalrun` command after installing it locally:

```sh
shoalrun scaffold how-to -n /path/to/project/content/track-parcel.mdx
```

The CLI discovers `docs.config.yaml` in the current directory or a parent. It derives draft values from the target path relative to the content directory. For `content/guides/retry-payments.mdx` with `guide`:

| Field     | Derived value                                                              |
| --------- | -------------------------------------------------------------------------- |
| `id`      | `guide.guides.retry-payments`                                              |
| `title`   | `Retry Payments`                                                           |
| `summary` | `Draft guide for retry payments. Replace this summary before publication.` |
| `slug`    | `/guides/retry-payments`                                                   |

The derived summary counts as a placeholder, so the page cannot be published until you replace it. Override any value with `--id`, `--title`, `--summary`, or `--slug`. Other options are `--config FILE`, `--channel`, `--version`, and `--language` (defaults come from `publications.defaults`), and `--operation ID`, which can repeat. `--new` is the long form of `-n`. The [CLI reference](https://www.shoalrun.com/cli.md) lists every rule.

If the target path begins with the selected publication's route prefix, the short form omits that prefix from the derived slug. For example, with version `v2` configured at `/v2`, `content/v2/check-payment.mdx` gets slug `/check-payment` and route `/v2/check-payment`. The stable ID still derives from the complete content path; use `--id` if several versions represent the same document.

Every new page is a draft. Its detailed placeholders remain visible for author and AI edits, and an unresolved placeholder fails the public build. This guard catches unfinished sections; a human still needs to check technical claims and example behavior before publication.

## Related reading

### Read first

- [Page metadata](https://www.shoalrun.com/author/frontmatter.md) — Know which fields a new page needs before you pre-fill them.

### Reference while working

- [CLI reference](https://www.shoalrun.com/cli.md) — Look up the scaffold command's arguments and defaults.

- [Design templates](https://www.shoalrun.com/author/design-templates.md) — Choose structures and prompts that serve the reader.

### Related topics

- [Compose and maintain recipes](https://www.shoalrun.com/author/recipe-drafts.md) — Use a project template when an API example is not the right starting point.

### Often confused with

- [Reuse prose across pages](https://www.shoalrun.com/author/snippets.md) — A template is copied into a new page once; a snippet is shared prose that stays in sync on every page that includes it.
