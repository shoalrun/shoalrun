---
id: guide.component.breadcrumbs
title: Breadcrumbs
summary: Show where a page sits in the configured navigation hierarchy.
type: reference
area: appearance
subarea: appearance-navigation
canonical: /author/components/breadcrumbs
---

# Breadcrumbs

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > Navigation > Breadcrumbs

**Updated: 2026-10-19.**

Breadcrumbs are built into site navigation. Shoalrun generates them from the [navigation tree](https://www.shoalrun.com/author/navigation.md). Place a page under its intended groups in navigation; there is no `<Breadcrumbs>` tag to repeat in each MDX file.

## Configuration

This abbreviated navigation puts Breadcrumbs under the Customize and Navigation groups. Those labels become part of its trail: **Customize / Navigation / Breadcrumbs**.

```yaml title="docs/config/nav.yaml"
- id: styling
  label: Customize
  items:
    - id: navigation
      label: Navigation
      items:
        - id: navigation-overview
          doc: guide.navigation-lifecycle
          label: Overview
        - id: breadcrumbs
          doc: guide.component.breadcrumbs
```

A group without a document has a plain-text label in the trail. An ancestor with a document becomes a link. The current page is shown as text, never as a link to itself. Top-level pages have no trail.

## HTML, Markdown, and agents

HTML puts a breadcrumb navigation region above the page heading. It uses an ordered list and marks the current page with `aria-current="page"`. Links remain ordinary keyboard-accessible links, and the trail works without JavaScript.

Markdown shows the same path near the title. Ancestors with pages link to their Markdown versions. Each [document manifest](https://www.shoalrun.com/documents.json) entry has a `breadcrumbs` array containing ordered labels and any available URLs. An agent can recover the hierarchy without parsing HTML navigation.

## Related reading

### Reference while working

- [Organize site navigation](https://www.shoalrun.com/author/navigation.md) — Place pages in navigation to generate their breadcrumb trails.

### Related topics

- [Organize site navigation](https://www.shoalrun.com/author/navigation.md) — Understand the breadcrumb trails generated from navigation groups.
