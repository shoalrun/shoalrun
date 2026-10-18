---
id: reference.pele-gallery
title: Pele gallery
summary: Browse Mermaid-syntax diagrams and flowchart shapes rendered with Pele.
type: reference
canonical: /author/components/diagrams/pele-gallery
---

# Pele gallery

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Diagrams > Pele gallery

**Updated: 2026-10-17.**

Parent page: [Full Markdown page](/author/components/diagrams/pele-gallery.md)

Browse examples of Pele's 33 built-in diagram families, including its version display, and 48 flowchart shapes. Every example uses Shoalrun's [Diagram component](https://www.shoalrun.com/author/components/diagrams.md) with Mermaid syntax. These illustrate notation; they do not describe live services or measured product results.

Open **Source** beneath a diagram to copy its syntax. See [Pele's examples](https://pele.run/examples) for more variations and [compatibility notes](https://pele.run/compatibility) for differences from Mermaid.

## Systems and structures

### Class

Describe types, fields, and relationships.

**Class**

Describe types, fields, and relationships.

[View Class diagram](https://www.shoalrun.com/assets/diagrams/mermaid-af73adf46c1d18e97da9-light.svg)

```mermaid
classDiagram
 class Page {
 +String title
 +String slug
 +render()
 }
 class Section {
 +String heading
 }
 Page "1" *-- "many" Section
```

### Source: Class

```mermaid
classDiagram
 class Page {
 +String title
 +String slug
 +render()
 }
 class Section {
 +String heading
 }
 Page "1" *-- "many" Section
```

### Entity relationship

Show entities and relationship cardinality.

**Entity relationship**

Show entities and relationship cardinality.

[View Entity relationship diagram](https://www.shoalrun.com/assets/diagrams/mermaid-2c935f03a00d8732c5f6-light.svg)

```mermaid
erDiagram
 PROJECT ||--o{ PAGE : contains
 PAGE ||--o{ SECTION : contains
 PAGE {
 string id PK
 string title
 }
 SECTION {
 string heading
 }
```

### Source: Entity relationship

```mermaid
erDiagram
 PROJECT ||--o{ PAGE : contains
 PAGE ||--o{ SECTION : contains
 PAGE {
 string id PK
 string title
 }
 SECTION {
 string heading
 }
```

### Architecture

Connect services using built-in symbols.

**Architecture**

Connect services using built-in symbols.

[View Architecture diagram](https://www.shoalrun.com/assets/diagrams/mermaid-2604ab6aac56722b033b-light.svg)

```mermaid
architecture-beta
 group docs(cloud)[Documentation]
 service app(server)[Site] in docs
 service store(database)[Content] in docs
 app:R -- L:store
```

### Source: Architecture

```mermaid
architecture-beta
 group docs(cloud)[Documentation]
 service app(server)[Site] in docs
 service store(database)[Content] in docs
 app:R -- L:store
```

### C4

Describe a system and its users at a high level.

**C4**

Describe a system and its users at a high level.

[View C4 diagram](https://www.shoalrun.com/assets/diagrams/mermaid-d31ce80c287440a978dd-light.svg)

```mermaid
C4Context
 title Documentation context
 Person(reader, "Reader", "Finds instructions")
 System(docs, "Documentation", "Published guides")
 Rel(reader, docs, "Reads")
```

### Source: C4

```mermaid
C4Context
 title Documentation context
 Person(reader, "Reader", "Finds instructions")
 System(docs, "Documentation", "Published guides")
 Rel(reader, docs, "Reads")
```

### Block

Arrange connected blocks in explicit columns.

**Block**

Arrange connected blocks in explicit columns.

[View Block diagram](https://www.shoalrun.com/assets/diagrams/mermaid-4b2a2cf39d3fe9446598-light.svg)

```mermaid
block-beta
 columns 3
 a["Author"] b["Build"] c["Publish"]
 a --> b
 b --> c
```

### Source: Block

```mermaid
block-beta
 columns 3
 a["Author"] b["Build"] c["Publish"]
 a --> b
 b --> c
```

### Mindmap

Organize related documentation topics.

**Mindmap**

Organize related documentation topics.

[View Mindmap diagram](https://www.shoalrun.com/assets/diagrams/mermaid-5132acfd3a5b749b60f6-light.svg)

```mermaid
mindmap
 root((Documentation))
  Authoring
   Pages
   Components
  Publishing
   Builds
   Hosting
```

### Source: Mindmap

```mermaid
mindmap
 root((Documentation))
  Authoring
   Pages
   Components
  Publishing
   Builds
   Hosting
```

### Tree view

Display a directory hierarchy.

**Tree view**

Display a directory hierarchy.

[View Tree view diagram](https://www.shoalrun.com/assets/diagrams/mermaid-b87a0cb8033d4ea6c61b-light.svg)

```mermaid
treeView-beta
 "docs"
  "content"
   "start.mdx"
   "configuration.mdx"
  "docs.config.yaml"
```

### Source: Tree view

```mermaid
treeView-beta
 "docs"
  "content"
   "start.mdx"
   "configuration.mdx"
  "docs.config.yaml"
```

### Requirement

Connect an implementation element to a requirement.

**Requirement**

Connect an implementation element to a requirement.

[View Requirement diagram](https://www.shoalrun.com/assets/diagrams/mermaid-9b74d503a97fb3b146ea-light.svg)

```mermaid
requirementDiagram
 requirement readable {
 id: 1
 text: Preserve essential instructions
 risk: low
 verifymethod: test
 }
 element markdown {
 type: renderer
 }
 markdown - satisfies -> readable
```

### Source: Requirement

```mermaid
requirementDiagram
 requirement readable {
 id: 1
 text: Preserve essential instructions
 risk: low
 verifymethod: test
 }
 element markdown {
 type: renderer
 }
 markdown - satisfies -> readable
```
