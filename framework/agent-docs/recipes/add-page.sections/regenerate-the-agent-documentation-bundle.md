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

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Maintain this documentation site > Add a page to this documentation site

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/recipes/add-page.md)

Create a guide, add navigation, build and audit it, then refresh its agent documentation.

## Regenerate the agent documentation bundle

- Use `frameworkCli` from **Install the site dependencies**: The pinned Shoalrun package installed for this site.
- Use `builtSite` from **Build the Shoalrun docs site**: The successful current site build at docs/dist.

Export the already built site for the framework’s next documentation snapshot:

```sh
npm run agent-docs:build
```

Build the site first. The export copies that output without rebuilding and records the site build identity and pinned package integrity in `agent-docs/provenance.json`. It does not modify the installed package.

Review and transfer the export as a versioned artifact to the framework repository. Framework releases consume an explicitly selected snapshot; they must not fetch the latest site during a package build.

Save `agentBundle`: The exported Markdown, manifest, search index, and provenance under agent-docs.

**Continue when:** The command reports matching counts of bundled Markdown pages and search records.
