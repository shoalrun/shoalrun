---
id: guide.component.callout
title: Callouts
summary: Use built-in callouts or register a type with its own label, tone, and icon.
type: reference
area: components
subarea: components-prose
canonical: /author/components/callout
---

# Callouts

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Callouts

**Updated: 2026-10-26.**

`<Callout>` highlights a short message in the reading flow. Use a type that matches the message's purpose. The type sets the HTML color and decorative icon, while a visible label carries the meaning in both HTML and Markdown.

## Choose a type

Choose a callout type that matches the information readers need to notice.

| Type        | Use it for                                                    |
| ----------- | ------------------------------------------------------------- |
| `note`      | Helpful context or a clarification.                           |
| `tip`       | A practical suggestion that makes a task easier.              |
| `important` | Information readers must notice to complete a task correctly. |
| `warning`   | A possible problem readers can avoid.                         |
| `caution`   | A higher-risk action or consequence that needs extra care.    |

```mdx
<Callout type="warning">Use a fresh idempotency key for a new payment.</Callout>
```

> **Note:** The example API is fictional.

> **Tip:** Keep a copy of the response ID for later checks.

> **Important:** Check the selected API version before copying a request.

> **Warning:** A changed idempotency key can create a second payment.

> **Caution:** Review the target environment before deleting data.

## Attributes and defaults

Use these attributes to set the callout type and its visible title.

| Attribute | Required | Meaning                                                                  |
| --------- | -------- | ------------------------------------------------------------------------ |
| `type`    | No       | A built-in or registered type. Omitted with no label defaults to `note`. |
| `label`   | No       | Nonempty literal text that replaces the visible type name.               |

Set both when the message needs a more specific label:

```mdx
<Callout type="warning" label="Before retrying">Reuse the original idempotency key.</Callout>
```

> **Before retrying:** Reuse the original idempotency key.

A `label` without a `type` retains the neutral style used by earlier pages. Its label remains visible in Markdown:

```mdx
<Callout label="Before you begin">Use a draft page while checking examples.</Callout>
```

> **Before you begin:** Use a draft page while checking examples.

A bare `<Callout>` uses the `note` label and style. Unknown types, unsupported attributes, and empty labels fail the build.

> **Note:** This uses the default note style and label.

## Register a type

Add `callouts.types` to the project config. Each new type needs a `label` and a `tone`. The tone can be one of the five built-in values or a name registered in `callouts.tones`. An optional `icon` names a [Lucide icon](https://lucide.dev/icons/) in lowercase kebab-case. This site's configuration registers an `experiment` type with its own `laboratory` tone:

```yaml filename="docs.config.yaml"
callouts: { $include: ./config/callouts.yaml }
```

```yaml filename="config/callouts.yaml"
tones:
  laboratory:
    line: '#087f8c'
    background: '#e9f8f8'
    text: '#075c66'
    dark:
      line: '#3cb9c4'
      background: '#0e2a2d'
      text: '#8fe3ea'
types:
  experiment:
    label: Experiment
    tone: laboratory
    icon: flask-conical
```

Use the registered name in MDX:

```mdx
<Callout type="experiment">Try this flow in a test environment first.</Callout>
```

> **Experiment:** Try this flow in a test environment first.

Each custom tone needs `line` (left rule), `background`, and `text` (label and icon), all as hex colors. Multiple types can share a tone.

A tone's `dark` block sets the same three colors for [dark mode](https://www.shoalrun.com/styling/color-modes.md). It is optional on a light-only site. When `theme.mode` is `dark` or `system`, every tone in use needs `dark`, or the build fails. The build checks each tone against the site's [palette](https://www.shoalrun.com/styling/palettes.md) in every mode the site shows. Body text, links, and the label need 4.5:1 against the tone's background.

You can also use `callouts.tones` to replace a built-in tone's colors. The five built-in types have default labels and Lucide icons; you can override their `label`, `tone`, or `icon` in `callouts.types`. A registered type without an icon displays its label without an icon. Icons are decorative and hidden from assistive technology; the label stays in HTML and Markdown. Invalid names, colors, icons, and definitions fail the build.

## HTML, Markdown, and agents

The body accepts ordinary Markdown and supported MDX components. HTML renders a styled blockquote with the visible label and optional icon; Markdown renders a labeled blockquote with the full body. Colors and icons never carry the only meaning, and no browser script is needed. Keep the message short. Use a normal section heading for longer instructions.

The [CSS reference](https://www.shoalrun.com/author/css.md) lists the color tokens for each type. See the [component index](https://www.shoalrun.com/author/components.md) for other supported elements.

## Related reading

### Reference while working

- [CSS and theme reference](https://www.shoalrun.com/author/css.md) — Restyle callout tones with theme tokens.

### Related topics

- [Short definitions](https://www.shoalrun.com/author/components/info-hint.md) — Choose a short optional definition or an explanation visible in the reading path.
