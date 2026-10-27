---
id: guide.overview
title: Getting started
summary: Create a site, publish a page, and check both formats.
type: tutorial
area: project
subarea: project-overview
canonical: /start
---

# Getting started

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Getting started

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/start.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Create a page](https://www.shoalrun.com/author/add-page.md) — Create another page and add it to navigation.

This quickstart takes you from installing Shoalrun to your own working documentation site. You will scaffold a page from a template, complete its draft, put it in the sidebar, and read its HTML and Markdown output.

> **Alpha:** Pin an exact version and review release notes before upgrading. Configuration and output formats may change between alpha releases.

## Add the page to navigation

In `docs.config.yaml`, replace the existing `navigation` block with this block. Keep the rest of the file:

```yaml title="docs.config.yaml"
navigation:
  - id: welcome
    doc: guide.welcome
  - id: setup
    label: Setup
    items:
      - id: install
        doc: guide.install
      - id: first-page
        doc: guide.first-page
```

Creating a page does not add it to navigation automatically. This entry puts **Your first page** under **Setup**, using its frontmatter title as the label.
