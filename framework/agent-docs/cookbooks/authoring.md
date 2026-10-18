---
id: cookbook.authoring
title: Authoring workflows
summary: Choose a complete Shoalrun workflow for adding a guide, previewing a
  change, or refreshing agent docs.
type: cookbook
canonical: /cookbooks/authoring
---

# Authoring workflows

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Recipes and cookbooks > Cookbooks > Authoring workflows

**Updated: 2026-09-30.**

Choose the outcome you need for Shoalrun's own documentation. Each recipe includes setup, ordered work, handoffs, and an observable final check.

## Choose your task

What are you working on?. Choose one recipe.

- [Add a new guide — Add a page to this documentation site](https://www.shoalrun.com/recipes/add-page.md)

  Use when: A task needs a new page with navigation and current agent documentation.

  You need: A topic, a stable page ID, and time to write and review the actual instructions.

  You will have: A local public page, passing checks, and a refreshed agent bundle ready for review.

- [Preview an existing change — Preview a documentation change locally](https://www.shoalrun.com/recipes/preview-page.md)

  Use when: You want to inspect the current page in a browser and as Markdown.

  You need: An edited checkout and a free local port.

  You will have: A local HTTP preview with the changed page verified in both formats.

- [Refresh the agent bundle — Refresh Shoalrun's bundled agent docs](https://www.shoalrun.com/recipes/refresh-agent-docs.md)

  Use when: Authored documentation changed and the CLI needs the updated offline content.

  You need: Completed source edits and the stable ID of a page to check.

  You will have: Current CLI search and page lookup, a reviewed generated diff, and passing audits.

Adding a guide includes manual writing and review. The recipe then builds and audits the page and refreshes the agent bundle. Previewing an existing change starts a local server; refreshing the bundle verifies what the CLI can search and read. Choose one task at a time so shared setup runs once within that recipe.

Use **Link to this path** to share the selected instructions, **Download Markdown** to work from a saved copy, or **Print this path** for a checklist. These workflows prepare local changes for review; they do not commit or deploy them.

## Related reading

### Go deeper

- [Compose and maintain recipes](https://www.shoalrun.com/author/recipe-drafts.md) — See how these workflows are composed from checked-in ingredient files.

### Related topics

- [Add a page to this documentation site](https://www.shoalrun.com/recipes/add-page.md) — Choose a related Shoalrun workflow.

- [Preview a documentation change locally](https://www.shoalrun.com/recipes/preview-page.md) — Choose a related Shoalrun workflow.

- [Refresh Shoalrun's bundled agent docs](https://www.shoalrun.com/recipes/refresh-agent-docs.md) — Choose a related Shoalrun workflow.
