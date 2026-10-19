---
id: reference.writing-style
title: Example writing guide
summary: Adapt this site's writing guide for your own documentation and agent
  instructions.
type: reference
area: authoring
subarea: authoring-writing
canonical: /author/writing-style
---

# Example writing guide

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Write with agents > Shared writing guidance > Example writing guide

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/author/writing-style.md)

This page is an example of a project writing guide. The rules below are the house style for Shoalrun's own documentation site, and authors and agents use them through project instructions. Shoalrun does not automatically apply these rules to other projects.

## Ingredients, recipes, and cookbooks

Use a recipe for a task that should participate in the recipe and cookbook features. A recipe can be authored directly; ingredients and a composition spec are optional. Use ingredients when multiple recipes share instructions you want to maintain once. Use a cookbook when readers need help choosing a complete path. See [how these page types fit together](https://www.shoalrun.com/author/recipes.md).

For an ingredient, name what must already be available and what success makes available to the next step. When using `workflow` metadata, keep `inputs` and `outputs` consistent across the recipe and include the required `check`. State a check the reader can perform, such as “the build reports success and both output files exist,” rather than “make sure it works.” Metadata declares handoffs; it does not run commands or verify their results. Keep essential instructions in the body.

For a recipe, choose the order deliberately and explain how to recover from a failed step. The published recipe must contain the complete instructions; readers should not need to assemble ingredients themselves. Review assembled drafts before publication. Do not describe passing assembly checks as proof that the procedure succeeds. [Compose and maintain recipes](https://www.shoalrun.com/author/recipe-drafts.md) explains the authoring workflow.

For a cookbook, describe each choice's starting state and outcome. Use single selection for alternative or overlapping paths, such as build versus build-and-audit. Offer multiple selection only when the recipes make sense together. A chooser displays published recipes; it does not deduplicate their steps, connect dependencies, or execute them. If a combined task needs shared setup and explicit handoffs, write one complete recipe for it. [Configure a cookbook](https://www.shoalrun.com/author/cookbooks.md) explains the options.

Check each ingredient's instructions and each recipe's full outcome. Inspect the cookbook's HTML choices and Markdown recipe links. Keep prerequisites, failure guidance, and success checks readable in both formats.
