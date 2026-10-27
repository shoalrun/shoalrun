---
id: guide.component.kbd
title: Keyboard shortcuts
summary: Mark up key names and shortcuts inside documentation text.
type: reference
area: components
subarea: components-code
canonical: /author/components/kbd
---

# Keyboard shortcuts

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Components > Keyboard shortcuts

**Updated: 2026-10-27.**

Use `<Kbd>` to name a key or shortcut in a sentence. Include the action in the sentence; key styling alone does not explain what the shortcut does.

## Syntax

Put each key in its own `<Kbd>` tag and write any separator as ordinary text.

```mdx
Press <Kbd>⌘</Kbd> + <Kbd>C</Kbd> to copy selected text.
```

Press ⌘ + C to copy selected text.

## Attributes

`<Kbd>` takes nonempty plain text and no attributes. It works inside prose, headings, and table cells.

## HTML, Markdown, and agents

HTML renders each key as a semantic `<kbd>` element. There is no interactive behavior or JavaScript requirement.

Markdown keeps the key names as ordinary text. An agent receives the same instruction and shortcut without interpreting the visual key style.

## Related reading

### Related topics

- [Short definitions](https://www.shoalrun.com/author/components/info-hint.md) — Use key styling for shortcuts and a disclosure for optional definitions.
