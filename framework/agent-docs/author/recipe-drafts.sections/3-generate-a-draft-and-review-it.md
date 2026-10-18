---
id: guide.recipe-drafts
title: Compose and maintain recipes
summary: Use Shoalrun ingredient files and a recipe spec to produce a complete,
  reviewable task page.
type: how-to
canonical: /author/recipe-drafts
---

# Compose and maintain recipes

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Recipes and cookbooks > Compose and maintain recipes

**Updated: 2026-09-30.**

Parent page: [Full Markdown page](/author/recipe-drafts.md)

Use ingredients when several recipes share instructions you want to maintain in one place. This guide follows Shoalrun's **Build and audit this documentation site** recipe from its source files to its published page.

If you only need one task page, you can write a `type: recipe` page directly. Ingredients and the draft assembler are optional. Start with [how the pieces fit](https://www.shoalrun.com/author/recipes.md) for the distinction between authoring a recipe and choosing one in a cookbook.

The built-in `recipe`, `ingredient`, and `cookbook` scaffolds are available in any project without registering templates. For example:

```sh
shoalrun scaffold ingredient -n content/lookup-parcel.mdx
shoalrun scaffold recipe -n content/track-parcel.mdx
```

See [templates](https://www.shoalrun.com/author/templates.md) for their outlines and project overrides.

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
