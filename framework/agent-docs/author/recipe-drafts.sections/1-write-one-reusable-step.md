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

Parent page: [Full Markdown page](/author/recipe-drafts.md)

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
