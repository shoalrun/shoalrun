---
id: recipe.add-page
title: Add a page to this documentation site
summary: Create a guide, add navigation, build and audit it, then refresh its
  agent documentation.
type: recipe
area: authoring
subarea: authoring-pages
canonical: /recipes/add-page
---

# Add a page to this documentation site

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Recipes and cookbooks > Recipes > Add a page to this documentation site

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/recipes/add-page.md)

Create a guide, add navigation, build and audit it, then refresh its agent documentation.

## Complete the guide and add navigation

- Use `draftPage` from **Scaffold a new guide**: The draft file and stable ID returned by the scaffold step.

Open the scaffolded file and write the actual task, prerequisites, steps, and an observable success check. Set `updated` to today's date, replace the draft summary, and resolve every generated TODO prompt. Check every technical claim against the implementation or a tested workflow.

Set a suitable `card.icon`, such as `file-text`, to meet this site's page-card audit. Once the content is ready for review in the built site, change `access.policy` to `public` and add the stable document ID under the appropriate group in `docs/config/nav.yaml`:

```yaml
- { id: my-new-guide, doc: guide.my-new-guide }
```

For useful next steps, add edges to `docs/config/relationships.yaml` and put `<RelatedReading />` at the end of the page. Preserve the page ID if you later change its title or slug. Setting public access includes the page in the local build; it does not deploy the site.

Save `authoredPage`: The completed public page and its navigation entry, ready for a local build.

**Continue when:** The summary and scaffold prompts are replaced, the guide has a card icon, and navigation references its stable ID.
