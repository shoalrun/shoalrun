---
id: reference.d2-gallery
title: D2 gallery
summary: Browse D2 diagrams, layout engines, and basic shapes with copyable source.
type: reference
area: components
subarea: components-visuals
canonical: /author/components/diagrams/d2-gallery
---

# D2 gallery

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Diagrams > D2 gallery

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/author/components/diagrams/d2-gallery.md)

These 17 examples cover connected flows, containers, SQL tables, UML classes, sequences, grids, and 18 basic D2 shapes. Each uses Shoalrun’s [Diagram component](https://www.shoalrun.com/author/components/diagrams.md), with a width cap and copyable source. The diagrams illustrate notation rather than live services.

D2 generates separate light and dark SVG images. They follow the site’s color mode, but do not inherit its live palette or fonts. Use [D2 themes](https://d2lang.com/tour/themes/) and [styles](https://d2lang.com/tour/style/) to customize the source. For Mermaid syntax rendered by Pele, see the [Pele gallery](https://www.shoalrun.com/author/components/diagrams/pele-gallery.md).

The examples set `vars.d2-config.pad` to 16 pixels to keep the diagram padding compact. Width caps keep smaller examples from filling the page.

## Sequences and grids

### Sequence diagram

Read requests and responses in their declared order.

**Sequence diagram**

Read requests and responses in their declared order.

[View Sequence diagram diagram](https://www.shoalrun.com/assets/diagrams/d2-dfde758959c1556ca7a8-light.svg)

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

shape: sequence_diagram
agent: Agent
server: MCP server
index: Published index
agent -> server: Search documentation
server -> index: Find matching pages
index -> server: Page IDs
server -> agent: Read instruction
agent -> server: Read selected page
server -> agent: Markdown and citation
```

### Source: Sequence diagram

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

shape: sequence_diagram
agent: Agent
server: MCP server
index: Published index
agent -> server: Search documentation
server -> index: Find matching pages
index -> server: Page IDs
server -> agent: Read instruction
agent -> server: Read selected page
server -> agent: Markdown and citation
```

### Grid layout

Arrange related topics in a fixed number of columns.

**Grid layout**

Arrange related topics in a fixed number of columns.

[View Grid layout diagram](https://www.shoalrun.com/assets/diagrams/d2-7a47b44ade61a8139186-light.svg)

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

grid-columns: 3
start: Start
configure: Configure
author: Author
publish: Publish
measure: Measure
maintain: Maintain
```

### Source: Grid layout

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

grid-columns: 3
start: Start
configure: Configure
author: Author
publish: Publish
measure: Measure
maintain: Maintain
```
