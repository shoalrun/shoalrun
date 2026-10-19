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
