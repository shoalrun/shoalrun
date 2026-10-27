---
id: guide.component.cookbook-chooser
title: CookbookChooser
summary: Let readers select reviewed recipes and assemble them into one reading path.
type: reference
area: components
subarea: components-procedures
canonical: /author/components/cookbook-chooser
---

# CookbookChooser

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Components > CookbookChooser

**Updated: 2026-10-27.**

Use `<CookbookChooser>` to help a reader choose a complete recipe or combine compatible recipes. The author reviews each recipe and sets its place in the choice list. The browser loads the selected published recipe pages and displays their instructions. The component does not read ingredient files, generate a recipe, or execute commands. Start with [how recipes and cookbooks work](https://www.shoalrun.com/author/recipes.md), then [configure a cookbook](https://www.shoalrun.com/author/cookbooks.md); this page lists the component's exact syntax.

## Syntax

Map each option to a public recipe in project YAML, then place the chooser on a page in the same publication:

```yaml title="config/cookbooks.yaml"
site-checks:
  title: How much validation do you need?
  mode: single
  options:
    - { id: build, label: Build, doc: recipe.build-docs }
    - { id: audit, label: Audit, doc: recipe.audit-docs }
```

```yaml title="docs.config.yaml"
cookbooks: { $include: ./config/cookbooks.yaml }
```

```mdx
<CookbookChooser id="site-checks" />
```

Try the live chooser for this documentation project:

How much validation do you need?. Choose one recipe.

- [Build and check page artifacts — Build this documentation site](https://www.shoalrun.com/recipes/build-docs.md)

  Use when: You want to confirm a documentation edit compiles into HTML and Markdown.

  You need: A Shoalrun checkout with dependencies installed and the page's stable ID.

  You will have: A successful build and the checked paths for both page formats.

- [Build and run project audits — Build and audit this documentation site](https://www.shoalrun.com/recipes/audit-docs.md)

  Use when: You are preparing a change for review and need the configured API and project checks too.

  You need: A Shoalrun checkout with dependencies installed and the page's stable ID.

  You will have: A successful build, checked artifacts, and no failed configured audits.

## Attributes

Use these attributes to configure the component.

| Value               | Rule                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | Required literal cookbook ID from `cookbooks`. No child content or other attributes.                                            |
| `options`           | Nonempty ordered list of unique lowercase IDs, visible labels, and recipe document IDs. This order controls the assembled path. |
| `mode`              | Optional `single` for alternatives or `multiple` (default) for compatible recipes.                                              |
| Option descriptions | Optional `when`, `needs`, and `outcome` explain the choice in HTML and Markdown. Each is nonempty plain text.                   |
| Recipe target       | Must be a public `type: recipe` page in the chooser's channel, version, and language.                                           |

The build rejects duplicate IDs, labels, or recipe targets, plus missing, draft, wrong-type, or wrong-publication targets.

## HTML, Markdown, and agents

HTML displays checkboxes, or radio buttons for `mode: single`, after the page script starts. Selecting options loads the published recipe pages and assembles their instructions in configured order under **Your path**. Each section links to its source recipe. If a page cannot load, the source link remains available. The recipe list below the controls works without JavaScript.

The cookbook page and choice list are compiled at build time. Recipe content is fetched when a reader selects it in the browser. The selected option IDs are stored in the page URL. **Link to this path** preserves that selection; **Download Markdown** saves all selected recipe instructions, and **Print this path** prints the loaded path. Downloads fail as a whole if a recipe cannot be fetched. Printing is disabled while any selected recipe failed to load.

Markdown lists every recipe with its choice descriptions and a link to its `.md` page in the same order. An agent can choose a recipe from those descriptions and read its complete Markdown. The cookbook Markdown does not contain the browser-selected recipe bodies. Give an agent the recipe Markdown or downloaded selection to follow a task. A selection URL does not create a published Markdown endpoint.

## Related reading

### Related topics

- [Compose and maintain recipes](https://www.shoalrun.com/author/recipe-drafts.md) — Let readers assemble reviewed recipes into a path in a cookbook.
