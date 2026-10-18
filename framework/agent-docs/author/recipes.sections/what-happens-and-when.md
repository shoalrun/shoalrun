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

## What happens, and when

1. **An author prepares ingredients and a recipe spec.** Ingredients contain prose and commands. Their optional `workflow` metadata names the values or artifacts each step needs and produces.
2. **The author runs `recipe draft`.** The assembler copies ingredient bodies into a new MDX draft, combines identical prerequisites, and writes the declared handoffs and checks. It checks that each named input is available from setup or an earlier step.
3. **The author reviews and tests the recipe, then publishes it.** A normal site build turns the recipe page into HTML and Markdown. It also builds the cookbook page and its choice list.
4. **A reader chooses a recipe in the cookbook.** The browser fetches the already-published recipe and displays its instructions. The reader or their agent runs the commands and checks the results.

**Selecting a cookbook option does not assemble ingredients or run a task.** It loads finished recipe content. The cookbook's own introduction and choice descriptions come from its page and configuration.
