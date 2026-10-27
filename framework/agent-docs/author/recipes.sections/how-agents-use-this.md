---
id: guide.recipes-overview
title: Understand ingredients, recipes, and cookbooks
summary: See how reusable source instructions become complete recipe pages that
  a cookbook helps readers choose.
type: explanation
area: authoring
subarea: authoring-composition
canonical: /author/recipes
---

# Understand ingredients, recipes, and cookbooks

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Recipes and cookbooks > Understand ingredients, recipes, and cookbooks

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/author/recipes.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Compose and maintain recipes](https://www.shoalrun.com/author/recipe-drafts.md) — Follow the actual ingredient files and spec that produce Shoalrun's audit recipe.

- [Authoring workflows](https://www.shoalrun.com/cookbooks/authoring.md) — Use complete workflows for Shoalrun documentation work.

- [Welcome email workflows](https://www.shoalrun.com/cookbooks/welcome-email.md) — Try an acceptance check or follow a message ID through delivery and failure handling.

A **recipe** is the complete page someone follows to finish a task. An **ingredient** is a reusable piece of source documentation used to write that page. A **cookbook** is a page that helps readers choose a recipe.

Readers can open a recipe directly. Ingredients help authors maintain instructions shared by several recipes. A cookbook becomes useful when readers need help choosing which complete task to follow.

## How agents use this

Give an agent the source material that matches its task and the outcome you want.

| Agent task                      | What to give it                                                 | What these files help it do                                                             |
| ------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Write or maintain documentation | Ingredient source files, the recipe spec, and project evidence. | Reuse instructions and prepare consistent recipe drafts.                                |
| Complete a task                 | The finished recipe's Markdown.                                 | Follow the commands, pass values between steps, and evaluate the stated success checks. |
| Choose a task                   | The cookbook's Markdown.                                        | Read each option's purpose and follow the appropriate recipe link.                      |

The recipe assembler does not call a model. It does not execute commands, validate data types, or prove that a task succeeded. A declared output such as `builtSite` is a name and description; it does not create a directory or a shell variable. The recipe's commands produce the actual result.

A recipe's **Read as Markdown** link contains its complete published instructions. A cookbook's Markdown lists the choices and recipe links. The browser selection has no separate published Markdown endpoint. **Download Markdown** saves the selected recipes' instructions in a file you can give to an agent.
