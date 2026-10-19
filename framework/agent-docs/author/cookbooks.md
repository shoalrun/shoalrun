---
id: guide.cookbooks
title: Let readers choose recipes with a cookbook
summary: Create a page that helps readers choose among complete published recipes.
type: how-to
area: authoring
subarea: authoring-composition
canonical: /author/cookbooks
---

# Let readers choose recipes with a cookbook

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Recipes and cookbooks > Let readers choose recipes with a cookbook

**Updated: 2026-10-19.**

A cookbook combines an authored introduction with a list or chooser of **published recipe pages**. It does not read ingredient files. Ingredients have already been copied into the recipes during authoring.

This guide uses the [Site workflows cookbook](https://www.shoalrun.com/cookbooks/site-workflows.md). It offers a build check or a build-and-audit check. The audit recipe already includes the build, so the reader chooses one complete path.

## 1. Prepare the destination recipes

Publish each destination as a `type: recipe` page in the same channel, version, and language as the cookbook. Each recipe should contain the setup, steps, and success checks needed to follow it on its own.

Our two destinations are `recipe.build-docs` and `recipe.audit-docs`. They can be opened directly, even if the cookbook is removed. See [compose and maintain recipes](https://www.shoalrun.com/author/recipe-drafts.md) for how their ingredient source becomes a complete page.

## 2. Configure the choices

The following configuration points to those finished pages by stable document ID:

```yaml title="docs/config/cookbooks.yaml"
site-checks:
  title: How much validation do you need?
  mode: single
  options:
    - id: build
      label: Build and check page artifacts
      doc: recipe.build-docs
      when: You want to confirm an edit produces HTML and Markdown.
      needs: A Shoalrun checkout and the page's stable ID.
      outcome: A successful build and checked page files.
    - id: audit
      label: Build and run project audits
      doc: recipe.audit-docs
      when: You also need the configured API and project checks.
      needs: A Shoalrun checkout and the page's stable ID.
      outcome: Checked page files and no failed configured audits.
```

`doc` selects the recipe. `label` names the choice. The optional `when`, `needs`, and `outcome` fields explain the choice; they are descriptive text, not requirements the browser verifies. When `when` is omitted, the recipe's summary is shown.

Load this mapping from the project configuration. Shoalrun already has this include:

```yaml title="docs/docs.config.yaml"
cookbooks: { $include: ./config/cookbooks.yaml }
```

## 3. Put the chooser on a cookbook page

Write an MDX page with `type: cookbook`, the usual page identity and publication fields, and an introduction explaining the choices. Its body can contain:

```mdx
Choose the level of validation you need. The audit path includes the build.

<CookbookChooser id="site-checks" />
```

The component's `id` is the configuration key `site-checks`. It is separate from the cookbook page's document ID, `cookbook.site-workflows`.

A normal site build publishes the cookbook's own text and chooser. When a reader makes a selection, the browser fetches the selected recipe's HTML and shows the instructions under **Your path**. It does not call the recipe assembler, fetch ingredients, or execute commands.

For a simple directory of recipes, use [DocCards](https://www.shoalrun.com/author/components/cards.md) instead of a chooser. A page with `type: cookbook` does not require an interactive component.

## Choose single or multiple selection deliberately

Choose the selection mode based on whether readers should follow one path or combine several.

| Setting          | Reader behavior                                                              | Appropriate use                                                               |
| ---------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `mode: single`   | Choose one recipe with radio buttons.                                        | Alternative tasks or overlapping paths, such as build versus build-and-audit. |
| `mode: multiple` | Select several recipes with checkboxes; display them in configuration order. | Recipes that the author has checked make sense together. This is the default. |

Multiple selection displays whole recipe bodies, including any repeated setup. It does not deduplicate steps, connect outputs between recipes, or check their combined dependencies. If a combined task needs shared setup and explicit handoffs, compose it as one recipe and offer that recipe as a choice.

## What readers and agents receive

The published surfaces expose cookbook choices in different forms.

| Surface                        | Content                                                                 |
| ------------------------------ | ----------------------------------------------------------------------- |
| Cookbook HTML before selection | The authored introduction, choices, descriptions, and recipe links.     |
| Cookbook HTML after selection  | The selected published recipe instructions, loaded in the browser.      |
| Cookbook Markdown              | The authored introduction and all choice descriptions and recipe links. |
| Recipe Markdown                | The complete published instructions for that one recipe.                |
| Download Markdown              | A file containing the selected recipes' instructions.                   |

**Link to this path** preserves the selection in the browser URL. It does not create a new published Markdown page. An agent reading the cookbook's Markdown can choose a recipe link. Give a task-performing agent the recipe's Markdown or the downloaded selection.

**Print this path** prints the loaded instructions. If a recipe cannot load, its source link remains available. Markdown downloads fail as a whole rather than saving an incomplete selection. Without JavaScript, the visible recipe links still work.

## Check the result

Build the site and open the cookbook in HTML and Markdown. For single selection, try each option. For multiple selection, also try the combinations you intend readers to use. Follow each offered workflow and inspect its success checks.

The build rejects missing, draft, wrong-type, or wrong-publication recipe targets and duplicate option IDs, labels, or targets. A passing build establishes that the references are valid; the author still tests whether the instructions complete the task.

## Related reading

### Read first

- [Understand ingredients, recipes, and cookbooks](https://www.shoalrun.com/author/recipes.md) — Understand what ingredients, recipe pages, and cookbook choices each contribute.

### Reference while working

- [CookbookChooser](https://www.shoalrun.com/author/components/cookbook-chooser.md) — Look up the chooser's syntax and validation rules.
