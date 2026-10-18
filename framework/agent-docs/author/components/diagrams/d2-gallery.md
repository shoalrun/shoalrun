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

## Styles and code

Explicit source colors stay fixed in both modes. The reusable style below sets text and background together to preserve contrast.

### Reusable styles

Apply a shared style with explicit contrasting text and fill colors.

**Reusable styles**

Apply a shared style with explicit contrasting text and fill colors.

[View Reusable styles diagram](https://www.shoalrun.com/assets/diagrams/d2-5053add74b45bd80e90d-light.svg)

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
classes: {
 step: {
  style.fill: "#e9f3ef"
  style.font-color: "#16332e"
  style.stroke: "#52706a"
  style.border-radius: 8
 }
}
a: Draft { class: step }
b: Review { class: step }
c: Publish { class: step }
a -> b -> c
```

### Source: Reusable styles

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

direction: right
classes: {
 step: {
  style.fill: "#e9f3ef"
  style.font-color: "#16332e"
  style.stroke: "#52706a"
  style.border-radius: 8
 }
}
a: Draft { class: step }
b: Review { class: step }
c: Publish { class: step }
a -> b -> c
```

### Code block

Include a short source-code excerpt as a diagram node.

**Code block**

Include a short source-code excerpt as a diagram node.

[View Code block diagram](https://www.shoalrun.com/assets/diagrams/d2-0b5380be0068b2c0f18c-light.svg)

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

example: |ts
  const page = { title: "Getting started" };
  console.log(page.title);
|
```

### Source: Code block

```d2
vars: {
 d2-config: {
  pad: 16
 }
}

example: |ts
  const page = { title: "Getting started" };
  console.log(page.title);
|
```

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

## HTML, Markdown, and agents

The build renders each diagram to SVG without a browser. HTML shows the matching light/dark image and a caption. Markdown preserves every title, summary, SVG link, and D2 code fence, including the source inside closed disclosures.

This gallery illustrates selected D2 features rather than every possible diagram. Follow the [D2 tour](https://d2lang.com/tour/intro/) for the language, [SQL table syntax](https://d2lang.com/tour/sql-tables/), [UML classes](https://d2lang.com/tour/uml-classes/), and [sequence syntax](https://d2lang.com/tour/sequence-diagrams/).

## Related reading

### Reference while working

- [Diagrams](https://www.shoalrun.com/author/components/diagrams.md) — Configure diagram width, layout engines, and output behavior.

### Related topics

- [Pele gallery](https://www.shoalrun.com/author/components/diagrams/pele-gallery.md) — Compare D2 examples with Mermaid syntax rendered by Pele.
