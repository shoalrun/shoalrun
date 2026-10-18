---
name: shoalrun-recipes
description: Write or revise task-oriented how-tos, reusable ingredients, recipe compositions, and cookbook choices in a Shoalrun documentation project. Use for complete task workflows and their reuse or discovery; use ordinary authoring for explanations and reference pages.
---

# Write Shoalrun recipes

Start with the reader's goal and an observable success condition. Use `how-to` for a task page, or `recipe` when it participates in recipe composition or cookbook choices. Both need practical actions and an observable result. Preserve the user's requested format and established page IDs and routes. Use `explanation` for conceptual discussion and `reference` for exact facts; an existing how-to does not need an automatic type migration.

The CLI includes overrideable `recipe`, `ingredient`, and `cookbook` templates; scaffold with `shoalrun scaffold <template> -n <target>` without project registration.

Read `shoalrun docs read guide.recipes-overview`, then `guide.recipe-drafts` for composition or `guide.cookbooks` for choices. In a source checkout, use `node framework/dist/cli.js` in place of `shoalrun` after compiling the framework. Inspect the target project's config, neighboring pages, and existing ingredients before writing.

Choose only the layers the task needs:

- **Recipe:** write a complete page with prerequisites, ordered actions, explicit value handoffs, failure guidance, and a final success check. A recipe can be authored directly; ingredients are optional.
- **Ingredient:** extract instructions actually shared by recipes. Put reusable prose and commands in the MDX body. Declare `workflow.inputs` and `workflow.outputs` as name-to-description mappings, shared setup in `workflow.prerequisites`, and an observable `workflow.check`. These names describe dependencies; they do not create variables or execute code.
- **Composition:** list ingredient paths in recipe-spec order, relative to the spec file. Supply initial `inputs` and the final `outcome`. Run `recipe draft --spec <spec> --out <new-candidate> --config <config> --check`, then create and review the draft. Resolve missing inputs and duplicate output names; verify actual handoffs by following the task. The command copies source text and checks declared names, without calling a model or running the task.
- **Cookbook:** point options at complete published recipe IDs. Explain `when`, `needs`, and `outcome`. Use `mode: single` for alternatives or overlapping recipes. Use multiple selection only for compatible complete recipes; it does not deduplicate setup or connect their outputs. Add an authored introduction and `<CookbookChooser id="..." />`.

When creating or editing a recipe, ingredient, or cookbook page, set frontmatter `updated` to the current date in `YYYY-MM-DD` format. Preserve an existing `date`.

Find the source of an existing recipe before editing it. Generated recipes are snapshots. In Shoalrun's own repository, edit `docs/recipe-specs/` and ingredient sources, then use `node framework/scripts/build-shoalrun-recipes.mjs --write` and review the diff. That script replaces recipe bodies. Other projects may maintain their reviewed drafts independently.

Build the target site and inspect HTML and Markdown. Run applicable audits and test commands in an appropriate local fixture within the user's authorized scope. Distinguish checks actually run from manual or external steps still unverified. A public recipe must have complete instructions and resolved draft prompts. Cookbook Markdown lists choices; give a task-performing agent the recipe Markdown or a downloaded selection. Refresh generated agent docs when working on this repository.
