---
id: guide.component.badge
title: Badges
summary: Put a short, labeled status or platform name inside a sentence.
type: reference
area: components
subarea: components-prose
canonical: /author/components/badge
---

# Badges

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Components > Badges

**Updated: 2026-10-27.**

`<Badge>` adds a compact label inside prose, a heading, or a table cell. Write the state in its text; color and the optional icon only reinforce it.

## Syntax

```mdx
The API is <Badge variant="success" icon="check">Stable</Badge>.
```

The API is Stable.

## Built-in variants

These five variants are available in every Shoalrun project. None has a default icon.

| Variant   | Example    | Color source                                                                          |
| --------- | ---------- | ------------------------------------------------------------------------------------- |
| `neutral` | Platform   | `--color-field-surface`, `--color-ink`, and `--color-border` from the active palette. |
| `info`    | Preview    | The active palette's `callout-note` background, text, and line tokens.                |
| `success` | Stable     | The active palette's `callout-tip` background, text, and line tokens.                 |
| `warning` | Deprecated | The active palette's `callout-warning` background, text, and line tokens.             |
| `new`     | New        | The active palette's purple `callout-important` background, text, and line tokens.    |

The built-in variants follow the selected palette and color mode. A project can override a built-in variant or add another in `badges.variants`. Add `icon` only when it helps the reader. The variant changes presentation only; Markdown keeps the label text.

## Add a custom color

For example, this site registers a teal `partner` variant. It is a custom example, not one of the built-in variants. Give a custom variant `background` and `text` hex colors for light mode, and for dark mode if the site shows dark mode. `border` is optional and defaults to the text color. The build rejects unknown variant names and checks badge text against its background at 4.5:1 in each shown mode.

```yaml title="docs.config.yaml"
badges:
  variants:
    partner:
      light: { background: '#e5f5f3', text: '#175b57', border: '#4c9992' }
      dark: { background: '#102e2d', text: '#a6e7df', border: '#4caaa1' }
```

```mdx
This feature is <Badge variant="partner">Partner</Badge>.
```

This feature is Partner.

Projects can put this mapping in a separate file with `$include`. To change a built-in variant across a site, register that same name with custom colors. For broad palette changes, edit the [palette tokens](https://www.shoalrun.com/styling/palettes.md); for CSS-level overrides, see the [CSS reference](https://www.shoalrun.com/author/css.md).

## Attributes

### Attributes and output

Badge attributes control its label, appearance, and representation in the published outputs.

| Attribute | Required | Meaning                                                                                         |
| --------- | -------- | ----------------------------------------------------------------------------------------------- |
| `variant` | No       | A built-in or registered name. Defaults to `neutral`.                                           |
| `icon`    | No       | A lowercase [Lucide icon](https://lucide.dev/icons/) name, such as `check`. Decorative in HTML. |

The body must be nonempty plain text.

## HTML, Markdown, and agents

HTML renders a styled `<span>` with the visible label. Markdown keeps the label inline, so an agent receives the status or platform name without relying on color or an icon. There is no JavaScript behavior; the label remains readable without CSS.
