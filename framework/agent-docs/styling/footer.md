---
id: guide.footer
title: Site footer
summary: Add link columns, a bottom row of links, and a short text line below
  every page.
type: reference
area: appearance
subarea: appearance-navigation
canonical: /styling/footer
---

# Site footer

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > Site footer

**Updated: 2026-10-19.**

The footer sits below every page, after the navigation and article. Configure it under `site.footer`. Without that setting, the site has no footer.

```yaml title="docs.config.yaml"
site:
  title: Example documentation
  footer:
    columns:
      - title: Guides
        links:
          - { label: Get started, href: /start }
          - { label: Authentication, href: /guides/auth }
      - title: Company
        links:
          - { label: Status, href: "https://status.example.com" }
          - { label: Contact support, href: "mailto:support@example.com" }
    links:
      - { label: Privacy, href: /legal/privacy }
      - { label: Terms, href: /legal/terms }
    text: © 2026 Example, Inc.
```

Columns appear first, side by side on wide screens and stacked on phones. Below them, a bottom row shows `text` on the left and `links` on the right. Every part is optional, but the footer needs at least one of them.

## Footer settings

These settings configure the footer text and its links.

| Setting   | Required | Value                                                                                                         |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `columns` | No       | A list of link groups. Each has a `title` and a `links` list with at least one link.                          |
| `links`   | No       | Links for the bottom row, such as legal pages.                                                                |
| `text`    | No       | One line of plain text, such as a copyright notice. The build escapes it, so HTML and Markdown show as typed. |

Each link takes a `label` and an `href`. An `href` is a site-root path such as `/start`, an `http` or `https` URL, or a `mailto:` link. External `http` and `https` links get `rel="noopener"`. The build rejects any other URL scheme, including `javascript:`.

Footer links don't take a `style`. Use [header links](https://www.shoalrun.com/styling/header.md) for buttons and calls to action.

## Layout and themes

The footer uses the page's theme tokens, so each [theme preset](https://www.shoalrun.com/styling/themes.md) and palette restyles it. On `landing` and `splash` [layouts](https://www.shoalrun.com/styling/layouts.md), it matches the narrower landing width. The [CSS and theme reference](https://www.shoalrun.com/author/css.md) lists its classes.

The footer is part of the HTML page only. Markdown twins, search results, and `/llms.txt` do not include it.

## Related reading

No matching documents.
