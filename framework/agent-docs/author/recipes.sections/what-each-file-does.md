---
id: guide.recipes-overview
title: Understand ingredients, recipes, and cookbooks
summary: See how reusable source instructions become complete recipe pages that
  a cookbook helps readers choose.
type: explanation
canonical: /author/recipes
---

# Understand ingredients, recipes, and cookbooks

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Recipes and cookbooks > Understand ingredients, recipes, and cookbooks

**Updated: 2026-10-17.**

Parent page: [Full Markdown page](/author/recipes.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Compose and maintain recipes](https://www.shoalrun.com/author/recipe-drafts.md) — Follow the actual ingredient files and spec that produce Shoalrun's audit recipe.

- [Authoring workflows](https://www.shoalrun.com/cookbooks/authoring.md) — Use complete workflows for Shoalrun documentation work.

- [Welcome email workflows](https://www.shoalrun.com/cookbooks/welcome-email.md) — Try an acceptance check or follow a message ID through delivery and failure handling.

A **recipe** is the complete page someone follows to finish a task. An **ingredient** is a reusable piece of source documentation used to write that page. A **cookbook** is a page that helps readers choose a recipe.

Readers can open a recipe directly. Ingredients help authors maintain instructions shared by several recipes. A cookbook becomes useful when readers need help choosing which complete task to follow.

## What each file does

These are real files in this checkout:

| File                                       | What the author puts there                                                              | What it contributes                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `docs/content/ingredient-build-site.mdx`   | The build command, explanation, required inputs, expected outputs, and a success check. | Reusable source instructions for one step.                                            |
| `docs/recipe-specs/audit-docs.yaml`        | An ordered list of ingredient files, starting inputs, and the final goal.               | Instructions to the recipe assembler about which steps to copy and how to order them. |
| `docs/content/recipe-audit-docs.mdx`       | The assembled, reviewed recipe.                                                         | The complete page a person or agent follows.                                          |
| `docs/config/cookbooks.yaml`               | Choice labels and the published recipe ID for each option.                              | The chooser's options and descriptions.                                               |
| `docs/content/cookbook-site-workflows.mdx` | An introduction and `<CookbookChooser id="site-checks" />`.                             | The page where readers choose their task.                                             |
