---
id: guide.snippets
title: Reuse prose across pages
summary: Share validated prose across pages with typed variables.
type: how-to
area: authoring
subarea: authoring-composition
canonical: /author/snippets
---

# Reuse prose across pages

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Reusable snippets

**Updated: 2026-10-19.**

A snippet is a shared Markdown or MDX fragment that the build expands into each page that includes it. Use one when the wording must stay in sync across pages. A [template](https://www.shoalrun.com/author/templates.md) creates a draft once; editing a template does not change existing pages.

## Register a snippet

Import a `snippets` mapping in project config. Snippet IDs are dot-separated names, such as `authoring.build-check`. Each entry points to a plain `.md` or `.mdx` file and declares its variables:

```yaml filename="docs/config/snippets.yaml"
authoring.build-check:
  file: ../snippets/build-check.mdx
  variables:
    command: { type: string, required: true }
```

The snippet file uses `<Var name="command" />` in prose:

```mdx filename="docs/snippets/build-check.mdx"
<Callout label="Check the result">Run <Var name="command" /> after editing. Confirm the HTML page and Markdown twin contain the same resolved snippet text.</Callout>
```

A page includes it with literal values:

```mdx filename="docs/content/snippets.mdx"
<Snippet id="authoring.build-check" values={{ command: "npm test" }} />
```

## See a variable resolve

The example project has a second snippet with two variables:

```yaml filename="example/config/snippets.yaml"
payment.request-prep:
  file: ../snippets/request-prep.mdx
  variables:
    product: { type: string, required: true }
    header: { type: string, default: Idempotency-Key }
```

Its source file contains ordinary MDX prose:

```mdx filename="example/snippets/request-prep.mdx"
For <Var name="product" /> requests, choose a unique
<Var name="header" /> and provide the amount in minor currency units.
```

The guide supplies `product` and leaves `header` at its declared default:

```mdx filename="example/content/create-payment-guide.mdx"
<Snippet id="payment.request-prep" values={{ product: "Payments" }} />
```

Readers and agents get resolved text in their respective page formats:

> For Payments requests, choose a unique Idempotency-Key and provide the amount in minor currency units.

The real snippet also includes a nested retry note. It inherits `product` from the outer snippet. See `example/snippets/request-prep.mdx` and `example/content/create-payment-guide.mdx` in the repository.

This page uses that snippet below, so the published HTML and Markdown exercise the same expansion.

> **Check the result:** Run npm test after editing. Confirm the HTML page and Markdown twin contain the same resolved snippet text.

Values can be strings, numbers, or booleans. A variable can also list allowed values with `enum`, such as `tier: { type: string, enum: [free, pro] }`; its `default` must be one of them.

Snippet defaults, project variables, page variables, and invocation values apply in that order. Set project variables in the top-level `variables` mapping of `docs.config.yaml`, and page variables in a page's `variables` frontmatter:

```yaml title="docs.config.yaml"
variables:
  product: Payments
```

Unknown names, missing required values, wrong types, and recursive includes stop the build. The document manifest lists snippet IDs used by each page.

For this slice, snippets use inline `<Var />` in prose. Code blocks are never changed by string replacement. Put headings in the page, and use absolute or `doc:` links inside snippets. These limits avoid ambiguous anchors and broken relative links until their adapters are built.

## Component attributes

`<Snippet>` is a standalone empty element in a page or registered snippet. `<Var>` is an inline empty element inside a snippet file; using it directly in a page fails the build.

| Element     | Attribute | Required | Meaning                               |
| ----------- | --------- | -------- | ------------------------------------- |
| `<Snippet>` | `id`      | Yes      | Registered snippet ID.                |
| `<Snippet>` | `values`  | No       | Literal mapping of invocation values. |
| `<Var>`     | `name`    | Yes      | Variable declared for that snippet.   |

The included Markdown and supported MDX components render in both HTML and Markdown. Nested snippets work, but recursive includes fail. API embeds need page-level headings and cannot be placed inside snippets. Keep headings in the page, and use absolute or `doc:` links in snippets.

## Check the shared text

Build your project and open each page that includes the snippet. Confirm that HTML and Markdown both contain the resolved text and that no variable tags remain. Change the snippet source and rebuild; every including page should receive that change. If validation fails, correct the named variable, include, or type before publishing.

## Related reading

### Reference while working

- [Configuration reference](https://www.shoalrun.com/config.md) — Look up the snippets and variables settings.

### Often confused with

- [Templates](https://www.shoalrun.com/author/templates.md) — A template is copied into a new page once; a snippet is shared prose that stays in sync on every page that includes it.
