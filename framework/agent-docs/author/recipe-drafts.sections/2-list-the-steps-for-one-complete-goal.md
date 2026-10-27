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

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/author/recipe-drafts.md)

Use ingredients when several recipes share instructions you want to maintain in one place. This guide follows Shoalrun's **Build and audit this documentation site** recipe from its source files to its published page.

If you only need one task page, you can write a `type: recipe` page directly. Ingredients and the draft assembler are optional. Start with [how the pieces fit](https://www.shoalrun.com/author/recipes.md) for the distinction between authoring a recipe and choosing one in a cookbook.

The built-in `recipe`, `ingredient`, and `cookbook` scaffolds are available in any project without registering templates. For example:

```sh
shoalrun scaffold ingredient -n content/lookup-parcel.mdx
shoalrun scaffold recipe -n content/track-parcel.mdx
```

See [templates](https://www.shoalrun.com/author/templates.md) for their outlines and project overrides.

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
