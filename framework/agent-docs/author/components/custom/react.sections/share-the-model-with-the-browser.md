---
id: guide.custom-components.react
title: Data-driven React components
summary: Follow local data through a component plugin, shared documentation, and
  a React calculator.
type: explanation
canonical: /author/components/custom/react
---

# Data-driven React components

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Custom components > Data-driven React components

**Updated: 2026-10-18.**

Parent page: [Full Markdown page](/author/components/custom/react.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Custom components](https://www.shoalrun.com/author/components/custom.md) — Start with a small component whose content stays in MDX.

Use a declared data file when a component needs to generate tables, calculations, or other structured documentation. This advanced example adds data and generated explanations to the [small CopyText example](https://www.shoalrun.com/author/components/custom.md). A data file is optional; ordinary component text can stay in MDX.

## Share the model with the browser

The build module imports `policy.json` and `validatePolicy` and `retrySchedule` from `model.js`. Its `content()` function returns documentation built with content helpers and `data: policy`. Shoalrun serializes that validated instance data for the browser.

The browser module receives it directly:

```js
export function enhance({ root, controls, content, data: policy }) {
  // Mount the optional React calculator using policy.
  // Preserve the shared documentation in content.
}
```

The browser imports the same `retrySchedule` function as the build module. It does not parse table rows, depend on English labels, or maintain a separate calculation implementation. Renaming a documented label does not change the calculator's model.

React and React DOM are dependencies of this component package. Shoalrun compiles its JSX and imports when building the site; component consumers do not run a separate bundler. The interface still enhances shared documentation and does not render arbitrary MDX imports.
