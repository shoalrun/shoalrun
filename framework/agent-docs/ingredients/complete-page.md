---
id: ingredient.complete-page
title: Complete the guide and add navigation
summary: Write the guide, replace scaffold prompts, and make it discoverable in
  the local build.
type: ingredient
area: authoring
subarea: authoring-pages
canonical: /ingredients/complete-page
---

# Complete the guide and add navigation

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Maintain this documentation site > Reusable Shoalrun steps > Complete the guide and add navigation

**Updated: 2026-10-19.**

Open the scaffolded file and write the actual task, prerequisites, steps, and an observable success check. Set `updated` to today's date, replace the draft summary, and resolve every generated TODO prompt. Check every technical claim against the implementation or a tested workflow.

Set a suitable `card.icon`, such as `file-text`, to meet this site's page-card audit. Once the content is ready for review in the built site, change `access.policy` to `public` and add the stable document ID under the appropriate group in `docs/config/nav.yaml`:

```yaml
- { id: my-new-guide, doc: guide.my-new-guide }
```

For useful next steps, add edges to `docs/config/relationships.yaml` and put `<RelatedReading />` at the end of the page. Preserve the page ID if you later change its title or slug. Setting public access includes the page in the local build; it does not deploy the site.
