---
id: guide.explore
title: Explore the docs
summary: Explore topics and follow connections to find your next page.
type: overview
area: discovery
subarea: discovery-search
subjectLifecycle: experimental
canonical: /explore
---

# Explore the docs

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Starters and discovery > Explore the docs

**Updated: 2026-10-25.**

**Status: Experimental.**

## Agent entry point

**Start by fetching [documents.json](https://www.shoalrun.com/documents.json). Use this manifest to navigate the documentation and inspect the knowledge graph.**

Read `documents` for page IDs, titles, summaries, categories, and Markdown URLs. Read `relationships` for source and target IDs, relationship types, and authored reasons. Follow a page's Markdown URL to read its content. Use the [documentation index](https://www.shoalrun.com/llms.min.txt) when you need a text list of pages.

The interactive visualization below is for human navigation. Agents should use the manifest directly; parsing the graph controls or running browser JavaScript is unnecessary.

The Markdown twin contains this guide and its topic links. Use the manifest for the complete page catalog and relationship data.

**Experimental visualization.** Layouts, filters, and interactions may change as we improve this explorer.

Choose a topic, find a page, and follow the connections. Filter by area, subarea, or page type to narrow your view. Select a page to read its summary and see where it leads.

## Start with a topic

- [Get started](https://www.shoalrun.com/what-is-shoalrun.md): understand Shoalrun and set up a documentation project.
- [Write documentation](https://www.shoalrun.com/author/add-page.md): create a page and publish it in navigation.
- [Use components](https://www.shoalrun.com/author/components.md): add examples, diagrams, and other structured content.
- [Publish your site](https://www.shoalrun.com/publish.md): build and deploy your documentation.
- [Browse recipes](https://www.shoalrun.com/author/cookbooks.md): choose a procedure for your task.

The map groups pages by their declared area and subarea. These categories describe the subject of each page independently of navigation. Circles show topics within topics. Select a topic circle to zoom into it, then select a page to preview it. Branches start with the main node. Select it to reveal topics, then expand or collapse individual branches to find their pages. Connections show the reading relationships between pages. Matrix places source pages on rows and destination pages on columns. Select a marked cell to inspect its relationships. Filtered matrices open at a readable size. Scroll to move through the matrix, or pinch or hold Ctrl while scrolling to zoom. **Readable** restores the label size; **Fit** shows the whole matrix. Symbols identify relationship types without relying on color, and related topics and comparisons appear in both directions. Force arranges pages around those same reading relationships. Circle size reflects the number of pages in a topic.

Scroll or pinch to zoom, drag to pan, or use the zoom buttons. **Fit** brings the whole map into view. When the map is focused, use the arrow keys to pan, `+` and `-` to zoom, and `0` to fit.

Filter relationships to follow prerequisites, next steps, references, related topics, comparisons, or deeper reading. Edges show their type and point from the source page to its related page. Related topics and comparisons apply in both directions. Focus, Audience, and Reader filters use the site's configured page facets. Pages without a value for a facet remain available to every reader.

The sidebar's **Why they’re connected** explanation is authored text from each relationship's `reason` field in `docs/config/relationships.yaml`, published in `documents.json` at build time. Viewing the graph makes no model calls and generates no new relationships or explanations. To change that text, edit the reason and rebuild. [Declare relationships](https://www.shoalrun.com/author/related-reading.md) explains the fields and validation.

Select a page to preview its summary and follow a connection, or choose **Read this page** to open it. The matching page list offers the same page selection without using the map. Connections use the site's declared reading relationships; a page can be useful even when it has no declared connections.
