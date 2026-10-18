---
id: guide.header
title: Header links
summary: Add links and buttons to the site masthead.
type: reference
canonical: /styling/header
---

# Header links

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > Header links

**Updated: 2026-10-17.**

The masthead shows the site title, the publication label, the [search box](https://www.shoalrun.com/author/search.md), the [dark mode toggle](https://www.shoalrun.com/styling/color-modes.md) when it's on, and any links you configure. Add links under `site.header.links`:

```yaml title="docs.config.yaml"
site:
  title: Example documentation
  header:
    links:
      - { label: Guides, href: /start }
      - { label: GitHub, href: "https://github.com/example/project", style: button }
      - { label: Get started, href: /start, style: primary }
```

Links appear in list order, after the search box and toggle.

## Link settings

Use these settings to configure each link shown in the header.

| Setting | Required | Value                                                                             |
| ------- | -------- | --------------------------------------------------------------------------------- |
| `label` | Yes      | Visible link text.                                                                |
| `href`  | Yes      | A site-root path such as `/start`, an `http` or `https` URL, or a `mailto:` link. |
| `style` | No       | `link` (default), `button`, or `primary`.                                         |

`link` renders as plain text. `button` has an outline. `primary` fills with `--color-accent` and uses `--color-accent-contrast` for its text. Use one `primary` link at most, for the action you most want readers to take.

External `http` and `https` links get `rel="noopener"`. The build rejects any other URL scheme, including `javascript:`.

## Layout and themes

On narrow screens, the search box and links wrap onto their own row below the site title. Each [theme preset](https://www.shoalrun.com/styling/themes.md) restyles them to match its shape. The [CSS and theme reference](https://www.shoalrun.com/author/css.md) lists their classes.

Header links are part of the HTML page only. Markdown twins and `/llms.txt` do not include them.

## Related reading

### Reference while working

- [CSS and theme reference](https://www.shoalrun.com/author/css.md) — Look up the header classes each preset styles.

### Related topics

- [Light and dark mode](https://www.shoalrun.com/styling/color-modes.md) — The dark mode toggle appears in the header beside your links.

- [Site search](https://www.shoalrun.com/author/search.md) — The search box sits in the site header, before your header links.
