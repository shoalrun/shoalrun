---
id: guide.component.file-tree
title: File trees
summary: Show nested files and folders with links and an indented Markdown equivalent.
type: reference
area: components
subarea: components-code
canonical: /author/components/file-tree
---

# File trees

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Components > File trees

**Updated: 2026-10-27.**

`<FileTree>` shows a file layout or other hierarchy. `<Tree>` is an alias. Add `<Folder>` branches and `<File>` leaves; folders may contain more folders or files.

## Syntax

```mdx
<FileTree>
<Folder name="docs">
<Folder name="content">
<File name="start.mdx" doc="guide.overview" />
<File name="configuration.mdx" />
<Folder name="assets" collapsed>
<File name="overview.svg" />
</Folder>
</Folder>
<File name="docs.config.yaml" />
</Folder>
<File name="package.json" />
</FileTree>
```

- docs

  - content

    - [start.mdx](https://www.shoalrun.com/start.md)

    - configuration.mdx

    - assets

      - overview\.svg

  - docs.config.yaml

- package.json

## Attributes

Every node needs a nonempty `name`. Folders and files get icons automatically, and a folder’s icon changes when it opens. Optional `doc` or `href` makes its label a link; use only one. Optional `icon` accepts a lowercase Lucide name to override the default. `<File>` cannot have children.

## Expand and collapse folders

Folders start expanded. Readers can toggle them with a click, tap, Enter, or Space without JavaScript. Add `collapsed` to a folder to start it closed, and `controls` to the tree for optional expand-all and collapse-all buttons:

```mdx
<FileTree controls>
<Folder name="project">
<File name="README.md" />
<Folder name="content" collapsed>
<File name="start.mdx" />
</Folder>
</Folder>
</FileTree>
```

- project

  - README.md

  - content

    - start.mdx

With JavaScript, Up and Down move through visible controls and links; Home and End jump to the first and last. Right opens a folder or moves forward, and Left closes it or moves to its parent. Type a name to jump to a matching visible item, or press `*` to expand sibling folders at the current level. Tab still follows normal focus order. Expand-all and collapse-all buttons appear only when JavaScript is available.

## HTML, Markdown, and agents

HTML uses nested lists and native folder disclosures. Every file is in the initial HTML, including files in closed folders. Links retain normal keyboard behavior. Markdown is a nested list with every node and destination visible, so an agent can follow the hierarchy and links. Icons are decorative, so names must carry the meaning.
