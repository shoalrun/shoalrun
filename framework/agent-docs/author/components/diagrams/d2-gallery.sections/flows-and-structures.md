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

## Flows and structures

### Connected steps

Connect the stages of a documentation build.

**Connected steps**

Connect the stages of a documentation build.

[View Connected steps diagram](https://www.shoalrun.com/assets/diagrams/d2-ed5d2c734f7405d259ca-light.svg)

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
source: Source files
build: Build documentation
site: Published site
source -> build: compile
build -> site: publish
```

### Source: Connected steps

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
source: Source files
build: Build documentation
site: Published site
source -> build: compile
build -> site: publish
```

### Decision flow

Show approval and revision paths.

**Decision flow**

Show approval and revision paths.

[View Decision flow diagram](https://www.shoalrun.com/assets/diagrams/d2-f023e05f5977e9e44d78-light.svg)

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: down
draft: Draft guide
review: Ready to publish? { shape: diamond }
publish: Publish guide
revise: Revise guide
draft -> review
review -> publish: yes
review -> revise: no
revise -> draft
```

### Source: Decision flow

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: down
draft: Draft guide
review: Ready to publish? { shape: diamond }
publish: Publish guide
revise: Revise guide
draft -> review
review -> publish: yes
review -> revise: no
revise -> draft
```

### Connection styles

Distinguish directed, two-way, and dashed relationships.

**Connection styles**

Distinguish directed, two-way, and dashed relationships.

[View Connection styles diagram](https://www.shoalrun.com/assets/diagrams/d2-55582d9bb9130206fb5b-light.svg)

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
writer: Writer
reviewer: Reviewer
archive: Archive { shape: cylinder }
writer <-> reviewer: discuss
reviewer -> archive: approved copy
writer -> archive: reference { style.stroke-dash: 4 }
```

### Source: Connection styles

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
writer: Writer
reviewer: Reviewer
archive: Archive { shape: cylinder }
writer <-> reviewer: discuss
reviewer -> archive: approved copy
writer -> archive: reference { style.stroke-dash: 4 }
```

### Nested containers

Group a site and its supporting services.

**Nested containers**

Group a site and its supporting services.

[View Nested containers diagram](https://www.shoalrun.com/assets/diagrams/d2-751450ea4d28447efa14-light.svg)

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
project: Documentation project {
 content: Content files
 config: Configuration
}
site: Published site {
 html: HTML pages
 markdown: Markdown pages
}
project.content -> site.html
project.content -> site.markdown
project.config -> site
```

### Source: Nested containers

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
project: Documentation project {
 content: Content files
 config: Configuration
}
site: Published site {
 html: HTML pages
 markdown: Markdown pages
}
project.content -> site.html
project.content -> site.markdown
project.config -> site
```

### Service architecture

Connect readers, a documentation endpoint, and stored content.

**Service architecture**

Connect readers, a documentation endpoint, and stored content.

[View Service architecture diagram](https://www.shoalrun.com/assets/diagrams/d2-7178adc21966a0b12ada-light.svg)

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

reader: Reader { shape: person }
site: Documentation site
mcp: MCP endpoint
content: Published content { shape: cylinder }
reader -> site: browse
reader -> mcp: read with tools
site -> content
mcp -> content
```

### Source: Service architecture

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

reader: Reader { shape: person }
site: Documentation site
mcp: MCP endpoint
content: Published content { shape: cylinder }
reader -> site: browse
reader -> mcp: read with tools
site -> content
mcp -> content
```

### SQL tables

Show columns, key constraints, and a foreign-key relationship.

**SQL tables**

Show columns, key constraints, and a foreign-key relationship.

[View SQL tables diagram](https://www.shoalrun.com/assets/diagrams/d2-920c36c8238d13117606-light.svg)

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
pages: Pages {
 shape: sql_table
 id: text { constraint: primary_key }
 title: text
}
sections: Sections {
 shape: sql_table
 id: text { constraint: primary_key }
 page_id: text { constraint: foreign_key }
 heading: text
}
sections.page_id -> pages.id
```

### Source: SQL tables

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
pages: Pages {
 shape: sql_table
 id: text { constraint: primary_key }
 title: text
}
sections: Sections {
 shape: sql_table
 id: text { constraint: primary_key }
 page_id: text { constraint: foreign_key }
 heading: text
}
sections.page_id -> pages.id
```

### UML classes

Describe a page class and its section class.

**UML classes**

Describe a page class and its section class.

[View UML classes diagram](https://www.shoalrun.com/assets/diagrams/d2-72393cf842af129354fe-light.svg)

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
Page: {
 shape: class
 title: string
 slug: string
 render(): HTML
}
Section: {
 shape: class
 heading: string
 text: string
}
Page -> Section: contains
```

### Source: UML classes

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
Page: {
 shape: class
 title: string
 slug: string
 render(): HTML
}
Section: {
 shape: class
 heading: string
 text: string
}
Page -> Section: contains
```
