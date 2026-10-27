---
id: guide.color-modes
title: Light and dark mode
summary: Light, dark, and system modes, toggle behavior, storage, and accessibility.
type: reference
area: appearance
subarea: appearance-themes
canonical: /styling/color-modes
---

# Light and dark mode

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > Light and dark mode

**Updated: 2026-10-26.**

Every [palette](https://www.shoalrun.com/styling/palettes.md) has a light set and a dark set. `theme.mode` decides which set readers see.

| Mode     | Behavior                                                                              |
| -------- | ------------------------------------------------------------------------------------- |
| `light`  | The default. Readers always see light mode.                                           |
| `dark`   | Readers always see dark mode.                                                         |
| `system` | Follows the reader's operating system setting. Shows a toggle unless you turn it off. |

## Lock the site to one mode

```yaml title="docs.config.yaml"
theme:
  mode: dark
```

A locked site writes only the colors for that mode and shows no toggle. The build checks contrast for that mode only.

## Follow the reader's setting

```yaml title="docs.config.yaml"
theme:
  mode: system
```

The site starts in the mode the reader's system prefers. A button in the masthead switches between light and dark. The browser stores the choice under the `shoalrun-color-mode` local storage key on that device, and the choice overrides the system setting.

To follow the system setting without a toggle, set `toggle: false`:

```yaml title="docs.config.yaml"
theme:
  mode: system
  toggle: false
```

`toggle: true` works only with `mode: system`. The build checks contrast for both modes.

Custom callout tones need dark colors before a site can show dark mode. The [callout guide](https://www.shoalrun.com/author/components/callout.md) explains the `dark` block.

## How it works

- `mode: system` writes both color sets to `/assets/palette.css`. The dark set applies inside `@media (prefers-color-scheme: dark)`.
- The page sets `<meta name="color-scheme">` to `light`, `dark`, or `light dark`, so scrollbars and form controls match.
- With the toggle on, `/assets/mode.js` loads in the page head before first paint. It reads the saved choice and sets `data-mode="light"` or `data-mode="dark"` on the `html` element, so the page doesn't flash the wrong colors.
- The toggle is a `button` with `aria-pressed`. Screen readers announce it as "Dark mode", pressed or not pressed.
- Without JavaScript, the toggle stays hidden and the system setting still applies.
- If the browser blocks storage, the toggle still works for the current page.

Target a mode in project CSS with `[data-mode="dark"]`, or with `prefers-color-scheme` for readers who have not used the toggle:

```css title="styles/project.css"
@media (prefers-color-scheme: dark) {
  :root:not([data-mode="light"]) .doc-card-icon { opacity: .9; }
}
:root[data-mode="dark"] .doc-card-icon { opacity: .9; }
```

Code blocks stay dark in both modes. By default, their syntax colors come from the palette's dark set. The [code block guide](https://www.shoalrun.com/author/components/code-blocks.md) explains how to change it.

## Related reading

### Related topics

- [Header links](https://www.shoalrun.com/styling/header.md) — The dark mode toggle appears in the header beside your links.

- [Color palettes](https://www.shoalrun.com/styling/palettes.md) — A palette has one color set for light mode and one for dark mode.
