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

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Visual examples > D2 gallery

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/author/components/diagrams/d2-gallery.md)

These 17 examples cover connected flows, containers, SQL tables, UML classes, sequences, grids, and 18 basic D2 shapes. Each uses Shoalrun’s [Diagram component](https://www.shoalrun.com/author/components/diagrams.md), with a width cap and copyable source. The diagrams illustrate notation rather than live services.

D2 generates separate light and dark SVG images. They follow the site’s color mode, but do not inherit its live palette or fonts. Use [D2 themes](https://d2lang.com/tour/themes/) and [styles](https://d2lang.com/tour/style/) to customize the source. For Mermaid syntax rendered by Pele, see the [Pele gallery](https://www.shoalrun.com/author/components/diagrams/pele-gallery.md).

The examples set `vars.d2-config.pad` to 16 pixels to keep the diagram padding compact. Width caps keep smaller examples from filling the page.

## Layout engines

These three examples use identical source with different layout engines. TALA is Shoalrun’s default; set `layout="elk"` or `layout="dagre"` to choose another. See [D2 layouts](https://d2lang.com/tour/layouts/).

### TALA layout

Compare the same source using TALA.

**TALA layout**

Compare the same source using TALA.

[View TALA layout diagram](https://www.shoalrun.com/assets/diagrams/d2-9b77d94435f25de02342-light.svg)

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
source: Source
validate: Validate
html: HTML
markdown: Markdown
source -> validate
validate -> html
validate -> markdown
```

### Source: TALA layout

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
source: Source
validate: Validate
html: HTML
markdown: Markdown
source -> validate
validate -> html
validate -> markdown
```

### ELK layout

Compare the same source using ELK.

**ELK layout**

Compare the same source using ELK.

[View ELK layout diagram](https://www.shoalrun.com/assets/diagrams/d2-b8e56e0e46a1d53c130c-light.svg)

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
source: Source
validate: Validate
html: HTML
markdown: Markdown
source -> validate
validate -> html
validate -> markdown
```

### Source: ELK layout

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
source: Source
validate: Validate
html: HTML
markdown: Markdown
source -> validate
validate -> html
validate -> markdown
```

### Dagre layout

Compare the same source using DAGRE.

**Dagre layout**

Compare the same source using DAGRE.

[View Dagre layout diagram](https://www.shoalrun.com/assets/diagrams/d2-9cc666a541215673ae63-light.svg)

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
source: Source
validate: Validate
html: HTML
markdown: Markdown
source -> validate
validate -> html
validate -> markdown
```

### Source: Dagre layout

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
source: Source
validate: Validate
html: HTML
markdown: Markdown
source -> validate
validate -> html
validate -> markdown
```
