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

## Use recipes for task-oriented how-tos

Use the built-in `how-to` template for a task page, or `recipe` when the page should participate in Shoalrun's recipe and cookbook features. Both take a reader from a known starting state to a verifiable result. Give it prerequisites, ordered actions, failure guidance, and a final success check. A recipe can be a short, directly authored page; it does not require ingredients, a YAML composition spec, or a cookbook.

Use the built-in `explanation` template to explain a concept or help readers understand a system. Use a reference page to describe fields, commands, or API behavior. Existing how-tos can keep their current type, stable ID, and route until a deliberate content revision calls for a change. A page's type does not prove its instructions have been tested.

| Writing task                                             | Starting format                          |
| -------------------------------------------------------- | ---------------------------------------- |
| Build this site and verify its output                    | A recipe.                                |
| Explain how the compiler produces HTML and Markdown      | An explanation page.                     |
| Look up CLI flags or configuration fields                | A reference page.                        |
| Reuse the same build instructions across several recipes | An ingredient included by those recipes. |
| Help a reader choose build, audit, or preview            | A cookbook pointing to complete recipes. |

The bundled `shoalrun-recipes` skill follows these choices. See [use the agent skills](https://www.shoalrun.com/contribute/agent-skills.md) for a copyable authoring request.
