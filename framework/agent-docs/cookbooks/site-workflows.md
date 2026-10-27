---
id: cookbook.site-workflows
title: Site workflows
summary: Choose a build check or a complete build-and-audit workflow for Shoalrun.
type: cookbook
area: publishing
subarea: publishing-builds
canonical: /cookbooks/site-workflows
---

# Site workflows

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Maintain this documentation site > Site workflows

**Updated: 2026-10-27.**

Use these recipes on a local Shoalrun checkout after editing documentation. Choose the level of validation you need. The audit path already includes the build and artifact checks, so run one complete path.

## Choose your check

How much validation do you need?. Choose one recipe.

- [Build and check page artifacts — Build this documentation site](https://www.shoalrun.com/recipes/build-docs.md)

  Use when: You want to confirm a documentation edit compiles into HTML and Markdown.

  You need: A Shoalrun checkout with dependencies installed and the page's stable ID.

  You will have: A successful build and the checked paths for both page formats.

- [Build and run project audits — Build and audit this documentation site](https://www.shoalrun.com/recipes/audit-docs.md)

  Use when: You are preparing a change for review and need the configured API and project checks too.

  You need: A Shoalrun checkout with dependencies installed and the page's stable ID.

  You will have: A successful build, checked artifacts, and no failed configured audits.

These recipes use the same installation, build, and artifact-check ingredients. The audit recipe adds the configured project and API checks. Neither path deploys the site. Use the preview workflow to inspect the rendered result before publishing.

## HTML, Markdown, and agents

The HTML chooser displays the complete recipe you select; its recipe links also work without JavaScript. The cookbook's Markdown lists the build and audit choices with links to their recipe pages. It does not contain a browser-selected workflow. An agent should read the chosen recipe's Markdown or receive the file from **Download Markdown** before carrying out its steps.

## Related reading

### Next steps

- [Preview a documentation change locally](https://www.shoalrun.com/recipes/preview-page.md) — Inspect the successful build over local HTTP.

### Go deeper

- [Compose and maintain recipes](https://www.shoalrun.com/author/recipe-drafts.md) — Inspect the recipe specs and reusable handoffs.

### Related topics

- [Build and audit this documentation site](https://www.shoalrun.com/recipes/audit-docs.md) — Choose a related Shoalrun workflow.

- [Build this documentation site](https://www.shoalrun.com/recipes/build-docs.md) — Choose a related Shoalrun workflow.
