---
id: guide.component.info-hint
title: Short definitions
summary: Let readers open a brief definition with a click, tap, or keyboard.
type: reference
area: components
subarea: components-prose
canonical: /author/components/info-hint
---

# Short definitions

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Components > Short definitions

**Updated: 2026-10-27.**

Use `<InfoHint>` for a short definition that readers can open when they need it. It is a click-to-expand disclosure. Use a [tooltip](https://www.shoalrun.com/author/components/tooltips.md) for brief text that appears on hover or keyboard focus. Put longer explanations in a [callout](https://www.shoalrun.com/author/components/callout.md) or a linked page.

## Syntax

Give the disclosure a visible `label` and one short plain-text definition.

```mdx
<InfoHint label="Canonical URL">
The preferred address for a page when several addresses show the same content.
</InfoHint>
```

Canonical URL: The preferred address for a page when several addresses show the same content.

## Attributes

Use these attributes to configure the component.

| Attribute | Required | Meaning                                        |
| --------- | -------- | ---------------------------------------------- |
| `label`   | Yes      | Nonempty text shown on the disclosure control. |

`<InfoHint>` must be a block element with one plain-text definition. It does not accept links, multiple paragraphs, or other components inside the definition.

`<Tooltip>` previously named this same disclosure. Use `<InfoHint>` to keep click-to-expand behavior; `<Tooltip>` now provides hover and focus behavior.

## HTML, Markdown, and agents

HTML uses native `<details>` and `<summary>` elements. Readers can open the definition with a click, tap, Enter, or Space without JavaScript. The definition is present in the initial HTML even while the disclosure is closed.

Markdown writes the label and definition together in ordinary text. An agent can read the explanation without opening a disclosure.

## Related reading

### Related topics

- [Callouts](https://www.shoalrun.com/author/components/callout.md) — Choose a short optional definition or an explanation visible in the reading path.

- [Keyboard shortcuts](https://www.shoalrun.com/author/components/kbd.md) — Use key styling for shortcuts and a disclosure for optional definitions.

### Often confused with

- [Collapsibles](https://www.shoalrun.com/author/components/collapsible.md) — A short definition contains plain text; a collapsible holds longer rich content.

- [Tooltips](https://www.shoalrun.com/author/components/tooltips.md) — Tooltips open on hover or focus; short definitions use native click-to-expand disclosures.
