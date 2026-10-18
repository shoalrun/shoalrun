---
id: reference.d2-gallery
title: D2 gallery
summary: Browse D2 diagrams, layout engines, and basic shapes with copyable source.
type: reference
canonical: /author/components/diagrams/d2-gallery
---

# D2 gallery

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Diagrams > D2 gallery

**Updated: 2026-10-17.**

Parent page: [Full Markdown page](/author/components/diagrams/d2-gallery.md)

These 17 examples cover connected flows, containers, SQL tables, UML classes, sequences, grids, and 18 basic D2 shapes. Each uses Shoalrun’s [Diagram component](https://www.shoalrun.com/author/components/diagrams.md), with a width cap and copyable source. The diagrams illustrate notation rather than live services.

D2 generates separate light and dark SVG images. They follow the site’s color mode, but do not inherit its live palette or fonts. Use [D2 themes](https://d2lang.com/tour/themes/) and [styles](https://d2lang.com/tour/style/) to customize the source. For Mermaid syntax rendered by Pele, see the [Pele gallery](https://www.shoalrun.com/author/components/diagrams/pele-gallery.md).

The examples set `vars.d2-config.pad` to 16 pixels to keep the diagram padding compact. Width caps keep smaller examples from filling the page.

## Basic shapes

These sheets compare 18 shape names in three-column grids. SQL tables, UML classes, and sequences appear in the examples above. See [D2 shapes](https://d2lang.com/tour/shapes/) for the language reference.

### D2 shapes 1

Compare rectangle, square, page, parallelogram, document, cylinder.

**D2 shapes 1**

Compare rectangle, square, page, parallelogram, document, cylinder.

[View D2 shapes 1 diagram](https://www.shoalrun.com/assets/diagrams/d2-d0feda061477e29ca477-light.svg)

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

grid-columns: 3
node0: rectangle { shape: rectangle }
node1: square { shape: square }
node2: page { shape: page }
node3: parallelogram { shape: parallelogram }
node4: document { shape: document }
node5: cylinder { shape: cylinder }
```

### Source: D2 shapes 1

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

grid-columns: 3
node0: rectangle { shape: rectangle }
node1: square { shape: square }
node2: page { shape: page }
node3: parallelogram { shape: parallelogram }
node4: document { shape: document }
node5: cylinder { shape: cylinder }
```

### D2 shapes 2

Compare queue, package, step, callout, stored_data, person.

**D2 shapes 2**

Compare queue, package, step, callout, stored_data, person.

[View D2 shapes 2 diagram](https://www.shoalrun.com/assets/diagrams/d2-d0288b123482c4cc1bac-light.svg)

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

grid-columns: 3
node0: queue { shape: queue }
node1: package { shape: package }
node2: step { shape: step }
node3: callout { shape: callout }
node4: stored_data { shape: stored_data }
node5: person { shape: person }
```

### Source: D2 shapes 2

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

grid-columns: 3
node0: queue { shape: queue }
node1: package { shape: package }
node2: step { shape: step }
node3: callout { shape: callout }
node4: stored_data { shape: stored_data }
node5: person { shape: person }
```

### D2 shapes 3

Compare diamond, oval, circle, hexagon, cloud, text.

**D2 shapes 3**

Compare diamond, oval, circle, hexagon, cloud, text.

[View D2 shapes 3 diagram](https://www.shoalrun.com/assets/diagrams/d2-9b2c7fcddd5d9a71eb28-light.svg)

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

grid-columns: 3
node0: diamond { shape: diamond }
node1: oval { shape: oval }
node2: circle { shape: circle }
node3: hexagon { shape: hexagon }
node4: cloud { shape: cloud }
node5: text { shape: text }
```

### Source: D2 shapes 3

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

grid-columns: 3
node0: diamond { shape: diamond }
node1: oval { shape: oval }
node2: circle { shape: circle }
node3: hexagon { shape: hexagon }
node4: cloud { shape: cloud }
node5: text { shape: text }
```
