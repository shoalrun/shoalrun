---
id: guide.component.tooltip
title: Tooltips
summary: Show brief supporting text on hover or keyboard focus, with a tap
  option for touch readers.
type: reference
area: components
subarea: components-prose
canonical: /author/components/tooltips
---

# Tooltips

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Tooltips

**Updated: 2026-10-19.**

Use `<Tooltip>` for brief supporting text beside a term. The text appears when readers hover over or focus the label. Use [Short definitions](https://www.shoalrun.com/author/components/info-hint.md) for click-to-expand explanations, or a [callout](https://www.shoalrun.com/author/components/callout.md) for warnings and instructions that belong in the reading path.

## Syntax

```mdx
Compare the <Tooltip label="build digest">A fingerprint of the published build's content.</Tooltip> before refreshing your cache.
```

Compare the build digest (A fingerprint of the published build's content.) before refreshing your cache.

| Attribute | Required | Meaning                                       |
| --------- | -------- | --------------------------------------------- |
| `label`   | Yes      | Nonempty text shown on the focusable trigger. |

The body must be one brief plain-text explanation. Links, formatted text, multiple paragraphs, and other components are unsupported. A tooltip may appear inline in a paragraph or as a standalone block.

`<Tooltip>` previously aliased `<InfoHint>`. Use `<InfoHint>` for the original native disclosure behavior.

## HTML, Markdown, and agents

With JavaScript, the label becomes a button linked to its explanation through `aria-describedby`. Hovering or focusing the label opens a popup with `role="tooltip"`. Readers can move the pointer over the popup without closing it. Escape dismisses it while focus stays on the label. Moving focus and the pointer away closes it. Touch readers can tap the label to open or close it, or tap elsewhere to dismiss it.

The popup contains no focusable controls. Use an ordinary link or disclosure when readers need to interact with the explanation. Keep tooltips supplementary; essential warnings, choices, and instructions belong in visible page content.

Without JavaScript, the label and explanation remain visible together in the page. Markdown includes the label and full explanation as ordinary text, so agents do not need hover, focus, or browser scripts. For the inline example above, the Markdown twin reads:

```md
Compare the build digest (A fingerprint of the published build's content.) before refreshing your cache.
```

The interaction follows the [WAI tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) and its guidance on [content shown on hover or focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html).

## Related reading

### Often confused with

- [Short definitions](https://www.shoalrun.com/author/components/info-hint.md) — Tooltips open on hover or focus; short definitions use native click-to-expand disclosures.
