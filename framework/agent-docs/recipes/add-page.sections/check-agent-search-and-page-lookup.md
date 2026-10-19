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

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/recipes/add-page.md)

Create a guide, add navigation, build and audit it, then refresh its agent documentation.

## Check agent search and page lookup

- Use `DOC_ID` from **Before you start**: The stable ID of the page being checked.
- Use `agentBundle` from **Regenerate the agent documentation bundle**: The refreshed offline documentation bundle.

Search and read the exported site snapshot explicitly:

```sh
npx --no-install shoalrun docs search "recipes and cookbooks" --site agent-docs
npx --no-install shoalrun docs read "$DOC_ID" --site agent-docs
```

Confirm the returned Markdown includes your change and links. Review `agent-docs/provenance.json` and the export inventory before handing the artifact to the framework release process. Plain `shoalrun docs read` uses the installed package’s snapshot, which is independent of this working tree.

Save `agentLookupConfirmed`: Search results and page Markdown from the refreshed bundle, plus a reviewed generated diff.

**Continue when:** Search includes the intended topic, docs read shows the current instructions, and generated changes are understood.
