---
id: guide.component.action-link
title: Action links
summary: Give a next step a prominent link style while retaining real navigation
  semantics.
type: reference
area: components
subarea: components-navigation
canonical: /author/components/action-link
---

# Action links

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Action links

**Updated: 2026-10-19.**

`<ActionLink>` styles a navigation link as a prominent action. `<Button>` is an alias for authors migrating button-like links. Both render a real `<a>` element, so they work with keyboard navigation and without JavaScript.

```mdx
<ActionLink doc="guide.add-page">Create a page</ActionLink>
<ActionLink href="https://example.com/download" variant="secondary">Download example</ActionLink>
```

[Create a page](https://www.shoalrun.com/author/add-page.md)
[Download example](https://example.com/download)

| Attribute       | Required | Meaning                                                                    |
| --------------- | -------- | -------------------------------------------------------------------------- |
| `doc` or `href` | Yes, one | A stable document ID, site path, fragment, HTTP(S) URL, or `mailto:` link. |
| `variant`       | No       | `primary` (default) or `secondary`.                                        |

The body is nonempty inline text, with optional emphasis or inline code.

## HTML, Markdown, and agents

HTML renders a real link with a visible focus state. Markdown retains its label and destination, resolving `doc` IDs to the target Markdown page. An agent can follow the destination without interpreting the visual button style.
