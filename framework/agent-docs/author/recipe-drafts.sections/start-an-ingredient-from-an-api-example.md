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
