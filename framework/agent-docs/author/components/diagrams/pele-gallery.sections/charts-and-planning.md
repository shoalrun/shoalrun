---
id: reference.pele-gallery
title: Pele gallery
summary: Browse Mermaid-syntax diagrams and flowchart shapes rendered with Pele.
type: reference
area: components
subarea: components-visuals
canonical: /author/components/diagrams/pele-gallery
---

# Pele gallery

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Diagrams > Pele gallery

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/author/components/diagrams/pele-gallery.md)

Browse examples of Pele's 33 built-in diagram families, including its version display, and 48 flowchart shapes. Every example uses Shoalrun's [Diagram component](https://www.shoalrun.com/author/components/diagrams.md) with Mermaid syntax. These illustrate notation; they do not describe live services or measured product results.

Open **Source** beneath a diagram to copy its syntax. See [Pele's examples](https://pele.run/examples) for more variations and [compatibility notes](https://pele.run/compatibility) for differences from Mermaid.

## Charts and planning

### Gantt

Schedule work against explicit dates.

**Gantt**

Schedule work against explicit dates.

[View Gantt diagram](https://www.shoalrun.com/assets/diagrams/mermaid-bc14dd13a7120c96ca7d-light.svg)

```mermaid
gantt
 title Documentation release
 dateFormat YYYY-MM-DD
 section Preparation
 Draft guides :a, 2026-10-01, 3d
 Review guides :b, after a, 2d
 section Release
 Publish :after b, 1d
```

### Source: Gantt

```mermaid
gantt
 title Documentation release
 dateFormat YYYY-MM-DD
 section Preparation
 Draft guides :a, 2026-10-01, 3d
 Review guides :b, after a, 2d
 section Release
 Publish :after b, 1d
```

### Git graph

Illustrate branches, commits, and merges.

**Git graph**

Illustrate branches, commits, and merges.

[View Git graph diagram](https://www.shoalrun.com/assets/diagrams/mermaid-e5ae178043ea21b49cdb-light.svg)

```mermaid
gitGraph
 commit id: "Start"
 branch guide
 checkout guide
 commit id: "Draft"
 checkout main
 merge guide
 commit id: "Publish"
```

### Source: Git graph

```mermaid
gitGraph
 commit id: "Start"
 branch guide
 checkout guide
 commit id: "Draft"
 checkout main
 merge guide
 commit id: "Publish"
```

### Pie

Compare proportions with explicit values.

**Pie**

Compare proportions with explicit values.

[View Pie diagram](https://www.shoalrun.com/assets/diagrams/mermaid-18a3bc3966a71d8e5701-light.svg)

```mermaid
pie title Example traffic channels
 "Direct" : 45
 "Search" : 35
 "Referral" : 20
```

### Source: Pie

```mermaid
pie title Example traffic channels
 "Direct" : 45
 "Search" : 35
 "Referral" : 20
```

### Kanban

Group tasks by workflow stage.

**Kanban**

Group tasks by workflow stage.

[View Kanban diagram](https://www.shoalrun.com/assets/diagrams/mermaid-93942a7f879aa38866d2-light.svg)

```mermaid
kanban
 todo[To do]
  setup[Configure project]
 review[Review]
  draft[Review guide]
 done[Done]
  install[Install tools]
```

### Source: Kanban

```mermaid
kanban
 todo[To do]
  setup[Configure project]
 review[Review]
  draft[Review guide]
 done[Done]
  install[Install tools]
```

### Timeline

Place milestones in chronological order.

**Timeline**

Place milestones in chronological order.

[View Timeline diagram](https://www.shoalrun.com/assets/diagrams/mermaid-4c5caba21e87b8315eb0-light.svg)

```mermaid
timeline
 title Documentation rollout
 Week 1 : Draft guides
 Week 2 : Review examples : Test installation
 Week 3 : Publish documentation
```

### Source: Timeline

```mermaid
timeline
 title Documentation rollout
 Week 1 : Draft guides
 Week 2 : Review examples : Test installation
 Week 3 : Publish documentation
```

### Quadrant chart

Compare work along two dimensions.

**Quadrant chart**

Compare work along two dimensions.

[View Quadrant chart diagram](https://www.shoalrun.com/assets/diagrams/mermaid-4f3126e587f0668928db-light.svg)

```mermaid
quadrantChart
 title Example priorities
 x-axis Low effort --> High effort
 y-axis Low impact --> High impact
 quadrant-1 Plan
 quadrant-2 Start
 quadrant-3 Defer
 quadrant-4 Reconsider
 Navigation: [0.25, 0.8]
 Rewrite: [0.8, 0.65]
 Cleanup: [0.2, 0.2]
```

### Source: Quadrant chart

```mermaid
quadrantChart
 title Example priorities
 x-axis Low effort --> High effort
 y-axis Low impact --> High impact
 quadrant-1 Plan
 quadrant-2 Start
 quadrant-3 Defer
 quadrant-4 Reconsider
 Navigation: [0.25, 0.8]
 Rewrite: [0.8, 0.65]
 Cleanup: [0.2, 0.2]
```

### XY chart

Compare values on labeled axes.

**XY chart**

Compare values on labeled axes.

[View XY chart diagram](https://www.shoalrun.com/assets/diagrams/mermaid-0df2ca68065a8841e446-light.svg)

```mermaid
xychart-beta
 title "Example weekly builds"
 x-axis [W1, W2, W3, W4]
 y-axis "Builds" 0 --> 50
 bar [12, 24, 32, 41]
 line [10, 20, 28, 35]
```

### Source: XY chart

```mermaid
xychart-beta
 title "Example weekly builds"
 x-axis [W1, W2, W3, W4]
 y-axis "Builds" 0 --> 50
 bar [12, 24, 32, 41]
 line [10, 20, 28, 35]
```

### Sankey

Show how quantities flow between groups.

**Sankey**

Show how quantities flow between groups.

[View Sankey diagram](https://www.shoalrun.com/assets/diagrams/mermaid-727b8fe84d5cec7c97a6-light.svg)

```mermaid
sankey-beta
 Sources,Guides,30
 Sources,Reference,20
 Guides,Readers,25
 Guides,Agents,5
 Reference,Readers,10
 Reference,Agents,10
```

### Source: Sankey

```mermaid
sankey-beta
 Sources,Guides,30
 Sources,Reference,20
 Guides,Readers,25
 Guides,Agents,5
 Reference,Readers,10
 Reference,Agents,10
```

### Radar

Compare several dimensions for two example approaches.

**Radar**

Compare several dimensions for two example approaches.

[View Radar diagram](https://www.shoalrun.com/assets/diagrams/mermaid-e6c71672433e8c18e22c-light.svg)

```mermaid
radar-beta
 title Example review scores
 axis a["Clarity"], b["Coverage"], c["Speed"]
 curve x["Approach A"]{4, 3, 5}
 curve y["Approach B"]{3, 5, 3}
 max 5
```

### Source: Radar

```mermaid
radar-beta
 title Example review scores
 axis a["Clarity"], b["Coverage"], c["Speed"]
 curve x["Approach A"]{4, 3, 5}
 curve y["Approach B"]{3, 5, 3}
 max 5
```

### Treemap

Compare the size of nested categories.

**Treemap**

Compare the size of nested categories.

[View Treemap diagram](https://www.shoalrun.com/assets/diagrams/mermaid-a600d77e82d5e5b73128-light.svg)

```mermaid
treemap-beta
 "Documentation"
  "Guides": 30
  "Reference": 45
  "Tutorials": 25
```

### Source: Treemap

```mermaid
treemap-beta
 "Documentation"
  "Guides": 30
  "Reference": 45
  "Tutorials": 25
```
