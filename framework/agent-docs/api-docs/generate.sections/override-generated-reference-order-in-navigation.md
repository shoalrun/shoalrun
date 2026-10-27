---
id: guide.api-generation
title: Generate and select API pages
summary: Choose operations, generate reference pages, and add editorial context
  to an API reference.
type: how-to
area: api
subarea: api-generation
canonical: /api-docs/generate
---

# Generate and select API pages

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Generate and select API pages

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/api-docs/generate.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md) — Register and review an API source before generating its pages.

**Next steps**

- [Organize site navigation](https://www.shoalrun.com/author/navigation.md) — Arrange selected operations in the site menu.

Start with a registered local API from [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md). Use generation when you want references for many operations without writing an MDX page for each one. The commands below run in your documentation project with `@shoalrun/cli` installed as in the [quickstart](https://www.shoalrun.com/start.md).

## Override generated reference order in navigation

`generateReferences` chooses which reference pages exist. The `navigation` list chooses where they appear. **You can put a generated reference's stable operation ID in an `operation:` entry to override its OpenAPI tag group and source order. No MDX page is needed.** Write those entries in the exact order readers should see them, then use `generated: tags` to place only the operations you did not list.

```yaml title="config/nav.yaml"
- id: widgets
  label: Widgets
  items:
    - { id: get-widget-nav, operation: widgets.getWidget }
    - { id: query-widgets-nav, operation: widgets.queryWidgets }
    - { id: create-widget-nav, operation: widgets.createWidget }
    - { id: other-widgets, api: widgets, generated: tags }
```

Here `GET /Query/widgets` may have the OpenAPI tag `Query`, but its generated reference appears second under **Widgets**. The listed operations appear in this YAML order, regardless of their path, tag, or position in the OpenAPI file. They are removed from the `generated: tags` remainder, so each appears once. The `id` fields such as `query-widgets-nav` identify menu entries; `operation` values are the stable IDs that select the reference pages. An authored MDX reference uses the same navigation rule. See [Organize site navigation](https://www.shoalrun.com/author/navigation.md) for the full layout.

To review the default publication's spec operation by operation, run:

```sh
npx --no-install shoalrun api select notes docs.config.yaml --output config/notes-pages.yaml
```

The command shows the method, path, ID, and summary for each operation and asks **yes** or **no**. It shows operations with authored pages but does not replace them. After the choices are complete, it writes the `pathPrefix` and `include` list to the selection file; `q` cancels without writing. Run `api review` again, inspect the candidate, and update `publicReview.digest` before rebuilding to apply the choices. Add `{ id: notes-generated, api: notes, generated: tags }` under a navigation group to display the generated pages by their first OpenAPI tag, or place selected operations explicitly in navigation. This site's [Example Notes API subnav](https://www.shoalrun.com/author/navigation.md) uses the tag generator.

The digest shown above is a placeholder. Keep your existing review digest while editing. After reviewing the new selection, replace it with the reported value. Selection limits generated pages; `source.publish: true` still publishes the full source, including operations without pages. Use `focused: true` and omit `publish` when you only need individual operation contracts.
