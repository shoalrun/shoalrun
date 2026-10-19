---
id: guide.recipe-drafts
title: Compose and maintain recipes
summary: Use Shoalrun ingredient files and a recipe spec to produce a complete,
  reviewable task page.
type: how-to
area: authoring
subarea: authoring-composition
canonical: /author/recipe-drafts
---

# Compose and maintain recipes

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Recipes and cookbooks > Compose and maintain recipes

**Updated: 2026-10-19.**

Use ingredients when several recipes share instructions you want to maintain in one place. This guide follows Shoalrun's **Build and audit this documentation site** recipe from its source files to its published page.

If you only need one task page, you can write a `type: recipe` page directly. Ingredients and the draft assembler are optional. Start with [how the pieces fit](https://www.shoalrun.com/author/recipes.md) for the distinction between authoring a recipe and choosing one in a cookbook.

The built-in `recipe`, `ingredient`, and `cookbook` scaffolds are available in any project without registering templates. For example:

```sh
shoalrun scaffold ingredient -n content/lookup-parcel.mdx
shoalrun scaffold recipe -n content/track-parcel.mdx
```

See [templates](https://www.shoalrun.com/author/templates.md) for their outlines and project overrides.

## 1. Write one reusable step

An ingredient is an MDX file with `type: ingredient`. Its body contains the instructions to reuse. This is a shortened version of `docs/content/ingredient-build-site.mdx`:

````mdx title="docs/content/ingredient-build-site.mdx"
---
id: ingredient.build-site
title: Build the Shoalrun docs site
summary: Compile authored documentation into local HTML and Markdown.
type: ingredient
slug: /ingredients/build-site
channel: production
version: current
language: en
access: { policy: public }
workflow:
  inputs:
    frameworkCli: The CLI compiled from this checkout.
  outputs:
    builtSite: The successful site build at docs/dist.
  prerequisites:
    - Run commands from the Shoalrun repository root.
  check: "The build reports status: ok."
---

Use the compiled CLI to build the documentation:

```sh
node framework/dist/cli.js build docs/docs.config.yaml docs/dist
```

If the build fails, fix the named source or configuration issue and rerun it.
````

The `workflow` fields describe the step:

| Field           | Meaning                                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inputs`        | Names and descriptions of values or artifacts that must already be available. Here, an earlier step must provide `frameworkCli`.                   |
| `outputs`       | Names and descriptions of what successful completion makes available to later steps. Here, `builtSite` means the successful output at `docs/dist`. |
| `prerequisites` | Setup instructions. The assembler includes identical strings once across the recipe.                                                               |
| `check`         | An observable condition for the reader to evaluate before continuing. Required whenever `workflow` is present.                                     |

These declarations do not run the command or create variables. The body tells the reader or agent what to do. The check tells them what result to inspect. The assembler checks names and order, so a typo such as `builtDocs` where the next step expects `builtSite` fails during assembly.

An ingredient can be private draft source for a recipe, or a published page readers can inspect. It must have a literal YAML header and match the recipe's default channel, version, and language. Without `workflow`, the assembler copies its body without checking handoffs.

## 2. List the steps for one complete goal

The recipe spec chooses the ingredients and their order. A shortened version of `docs/recipe-specs/audit-docs.yaml` is:

```yaml title="docs/recipe-specs/audit-docs.yaml"
schemaVersion: 1
id: recipe.audit-docs
title: Build and audit this documentation site
summary: Build current documentation and run the configured audits.
slug: /recipes/audit-docs
inputs:
  repositoryCheckout: A local Shoalrun checkout with dependencies installed.
  DOC_ID: Set the stable ID of the page you want to check.
ingredients:
  - ../content/ingredient-compile-framework.mdx
  - ../content/ingredient-build-site.mdx
  - ../content/ingredient-inspect-build.mdx
  - ../content/ingredient-audit-site.mdx
outcome: The build succeeds, both page formats exist, and configured audits pass.
```

Paths are relative to this spec file. The initial `inputs` are available before the first ingredient. The compile ingredient produces `frameworkCli`; the build ingredient requires it and produces `builtSite`; the artifact-check ingredient requires that build and `DOC_ID`.

The assembler rejects a missing input, repeated output name, repeated ingredient ID, or publication mismatch. It does not choose an order for you or verify that an output has the described value. The `outcome` is the final check for the complete recipe; omitting it leaves a prompt for the author to complete.

## 3. Generate a draft and review it

From this repository's root, compile the CLI and preview the draft using the existing spec:

```sh
npm --prefix framework run build
node framework/dist/cli.js recipe draft \
  --config docs/docs.config.yaml \
  --spec docs/recipe-specs/audit-docs.yaml \
  --out /tmp/shoalrun-audit-recipe.mdx --check
```

`--check` prints the proposed content and reports `would-create`, `unchanged`, or `would-change`. Remove `--check` to create the file. The write command refuses to overwrite an existing file; choose a new output path for a new candidate.

The output is a complete MDX **draft** with setup, ordered ingredient bodies, handoff descriptions, per-step checks, and the final outcome. It also contains a draft notice and a review checklist. No model or API is called, and none of the recipe's commands are executed during generation.

Read the complete draft and follow its instructions in a suitable environment. Check that the handoffs describe real outputs, that failures have useful guidance, and that the final check proves the stated goal. Remove the draft notice and review checklist once that work is complete.

For your own project, place the reviewed recipe in its content directory, change `access.policy` to `public`, and build the site. The recipe then works as a standalone page. A [cookbook](https://www.shoalrun.com/author/cookbooks.md) can offer it as a choice by its document ID.

## 4. Maintain Shoalrun's published recipe snapshots

This repository maintains five recipes from specs under `docs/recipe-specs/`. Their published pages are `docs/content/recipe-*.mdx`. The repository maintenance script regenerates these existing pages while preserving their publication IDs, routes, and card metadata.

| Change you want                                   | File to edit                                            |
| ------------------------------------------------- | ------------------------------------------------------- |
| Change a command or explanation shared by recipes | The corresponding `docs/content/ingredient-*.mdx` file. |
| Add, remove, or reorder a recipe step             | That recipe's YAML spec under `docs/recipe-specs/`.     |
| Change a recipe's starting inputs or final goal   | The spec's `inputs` or `outcome`.                       |
| Change the choices or labels shown in a cookbook  | `docs/config/cookbooks.yaml`.                           |
| Change a cookbook's introduction                  | Its `docs/content/cookbook-*.mdx` page.                 |

After reviewing ingredient or spec changes, run:

```sh
node framework/scripts/build-shoalrun-recipes.mjs --write
git diff -- docs/content/recipe-*.mdx
npm run docs:build
npm run agent-docs:build
```

The script replaces the five recipe bodies with their compositions and related-reading sections. Direct edits to those generated bodies are replaced on regeneration. Review the diff before treating the recipes as current.

To check freshness without changing files:

```sh
node framework/scripts/build-shoalrun-recipes.mjs --check
```

The test suite runs that check too. General `recipe draft` output has no automatic synchronization: it is an editable snapshot. The maintenance script above is this repository's explicit workflow for keeping its published recipes in sync.

## Start an ingredient from an API example

`ingredient draft` creates starting material from one configured outgoing API operation and a named request example. For the included notification fixture:

```sh
node framework/dist/cli.js ingredient draft \
  --config framework/example-configs/notifications/docs.config.yaml \
  --spec framework/example-configs/notifications/ingredient-specs/queue-welcome-email.yaml \
  --out /tmp/shoalrun-email-ingredient.mdx --check
```

Its YAML spec supplies `schemaVersion: 1`, the page's `id`, `title`, `summary`, and `slug`, plus `operation` and `requestExample`. An optional `workflow` mapping is copied into frontmatter. The command copies the generated cURL request and first inline 2xx response example, links the configured reference, and records a source digest. It supports the default publication and outgoing requests with generated cURL. Webhook receiver flows need authored instructions.

The generated file still needs setup, failure guidance, and a verified success check. An example response is not evidence that a live request worked. The [email cookbook](https://www.shoalrun.com/cookbooks/welcome-email.md) shows a completed workflow against the local simulator.

## Related reading

### Related topics

- [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md) — Configure the stable operation ID and review the OpenAPI source used by an API ingredient draft.

- [CookbookChooser](https://www.shoalrun.com/author/components/cookbook-chooser.md) — Let readers assemble reviewed recipes into a path in a cookbook.

- [Templates](https://www.shoalrun.com/author/templates.md) — Use a project template when an API example is not the right starting point.
