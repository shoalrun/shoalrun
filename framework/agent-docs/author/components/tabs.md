---
id: guide.component.tabs
title: Tabs
summary: Group alternate views while retaining every view in Markdown.
type: reference
area: components
subarea: components-procedures
canonical: /author/components/tabs
---

# Tabs

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Tabs

**Updated: 2026-10-26.**

`<Tabs>` presents alternate views, such as two output formats. Use it only when the choices are truly alternatives; a normal heading sequence is easier to read when readers need every section.

## Syntax

```mdx
<Tabs label="Output format">
<Tab label="HTML">

The page has navigation and controls.

</Tab>
<Tab label="Markdown">

The page keeps the content as text.

</Tab>
</Tabs>
```

### HTML

The page has navigation and controls.

### Markdown

The page keeps the content as text.

| Element | Attribute     | Meaning                                                                                                                     |
| ------- | ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `Tabs`  | `label`       | Required literal name for the whole group, used by assistive technology.                                                    |
| `Tabs`  | `equalHeight` | Optional bare attribute. Keeps the group as tall as its tallest tab. See [Keep the height steady](#keep-the-height-steady). |
| `Tabs`  | `sync`        | Optional group name for matching selections across tab groups on this page.                                                 |
| `Tab`   | `value`       | Optional matching key; defaults to the tab label. Values must be unique within a group.                                     |
| `Tab`   | `label`       | Required nonempty literal name for its control and Markdown heading.                                                        |

Use at least two nonempty, direct `Tab` children. A `Tab` cannot stand alone. Other direct children and attributes fail the build.

## Keep the height steady

By default, the group is as tall as its selected tab. When a reader switches between a short tab and a long one, the page jumps. Add `equalHeight` to size the group to its tallest tab instead. The content below the group stays put.

```mdx
<Tabs label="Output format" equalHeight>
```

The setting changes the HTML only. Without JavaScript, all panels stay visible. The Markdown twin is the same with or without it. Use it when your tabs differ in length. If one tab is much longer than the rest, leave it off, because every shorter tab then shows blank space.

## Synchronize related examples

Give related groups the same `sync` name. Choosing a tab updates other groups with a matching `value`, or a matching label when no value is supplied. Matching is case-sensitive. A group without that choice keeps its current selection; groups without `sync` stay independent.

```mdx
<Tabs label="Install a client" sync="language">
<Tab label="JavaScript" value="js">
npm install example-client
</Tab>
<Tab label="Python" value="py">
pip install example-client
</Tab>
</Tabs>
```

These two examples share a selection. Try choosing Python in either group:

### JavaScript

Install the JavaScript client with npm.

### Python

Install the Python client with pip.

### JavaScript

Import the JavaScript client in your application.

### Python

Import the Python client in your application.

`sync` names use up to 64 letters, numbers, dashes, or underscores, starting with a letter or number. Synchronization follows reader choices within this page; it does not store a cross-page preference or move focus to another group. Markdown still includes every tab.

## HTML, Markdown, and agents

HTML contains every panel before scripts run. Without JavaScript, all panels remain visible. With JavaScript, Left and Right arrows switch tabs, while Home and End choose the first and last.

The build replaces the tab controls with ordinary Markdown sections. Each `Tab` label becomes a level-three heading, followed by that tab's complete body, in source order. The outer `Tabs` label is for the HTML control and does not appear in Markdown. The first example on this page renders like this in the Markdown twin:

```md
### HTML

The page has navigation and controls.

### Markdown

The page keeps the content as text.
```

An agent reading the `.md` page gets every alternative without choosing a tab. Markdown inside each body stays Markdown; supported MDX components expand to their own Markdown forms during the build.

Each `Tab` body accepts ordinary Markdown, including lists, links, and fenced code, plus supported MDX components such as `Callout`, `DocLink`, and `Collapsible`. Put other content inside a `Tab` body. Dynamic MDX expressions and unknown components are not supported.

## Related reading

### Often confused with

- [Collapsibles](https://www.shoalrun.com/author/components/collapsible.md) — A collapsible hides optional detail behind one summary; tabs switch between alternate views of the same content.

- [Content for one format](https://www.shoalrun.com/author/components/only.md) — Tabs show alternate views to every reader; Only limits content to the HTML page or its Markdown twin.
