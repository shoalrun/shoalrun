---
id: reference.config-site
title: Site and theme settings
summary: Configure the site identity, header, footer, agent guidance, colors, and fonts.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config/site
---

# Site and theme settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference > Site and theme

**Updated: 2026-10-27.**

Configure the site identity, header, footer, agent guidance, colors, and fonts. These keys belong in `docs.config.yaml` or an included configuration file. For file composition and validation commands, see [Configure your project](https://www.shoalrun.com/configuration.md). Use the [configuration index](https://www.shoalrun.com/config.md) to find another setting.

## `site`

Required.

| Key              | Default                                  | Meaning                                                                                                                                                                                                                                                                                                                              |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`          | None                                     | Site name in the masthead and the heading of `/llms.txt`.                                                                                                                                                                                                                                                                            |
| `contentDir`     | `content`                                | Page directory, relative to the root config file. Every `.md` and `.mdx` file in it is read.                                                                                                                                                                                                                                         |
| `contentFilter`  | None                                     | Build-time whole-page selection by configured reader facets. All selected facets must match; any listed choice within a facet matches. Unmarked pages are excluded. Unknown or empty selectors and selections with no pages fail. See [separate sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md). |
| `basePath`       | `""`                                     | Mount point for public pages and resources, such as `/docs`. Use URL path segments without escapes or dot segments. Build tools keep internal manifests at the output root; the public site is also complete inside the `docs/` output subtree.                                                                                      |
| `origin`         | None                                     | The site's HTTPS origin, such as `https://docs.example.com`, with no path or trailing slash. Required to publish the API catalog, and makes link-preview URLs absolute.                                                                                                                                                              |
| `indexing`       | `true`                                   | Set `false` on previews to add noindex to pages, disallow crawling in `robots.txt`, and omit the XML sitemap.                                                                                                                                                                                                                        |
| `updated`        | None                                     | Optional YYYY-MM-DD fallback for sitemap `lastmod`, especially on generated API pages. Page `updated` overrides it.                                                                                                                                                                                                                  |
| `favicon`        | A mark drawn from the preset and palette | A local `.svg` or `.png` file. See [share images and favicon](https://www.shoalrun.com/styling/share-images.md).                                                                                                                                                                                                                     |
| `customCss`      | None                                     | A local `.css` file linked after the framework styles. See [CSS](https://www.shoalrun.com/author/css.md).                                                                                                                                                                                                                            |
| `editionBadge`   | `auto`                                   | Masthead publication label: `auto` shows only the channel, version, or language values that differ across publications; `always` or `never`.                                                                                                                                                                                         |
| `header.links`   | None                                     | Masthead links. See [header](https://www.shoalrun.com/styling/header.md).                                                                                                                                                                                                                                                            |
| `agentDiscovery` | Visually hidden until focused            | HTML agent guidance, visual presentation, and link labels. See `site.agentDiscovery` below.                                                                                                                                                                                                                                          |
| `footer`         | None                                     | Footer `columns`, bottom-row `links`, and a `text` line. See [site footer](https://www.shoalrun.com/styling/footer.md).                                                                                                                                                                                                              |

A minimal site needs only a title:

```yaml title="docs.config.yaml"
site:
  title: Payments documentation
```

Keep pages in another directory, add a stylesheet, and always show the publication label:

```yaml title="docs.config.yaml"
site:
  title: Payments documentation
  contentDir: pages
  customCss: ./styles/project.css
  editionBadge: always
```

Publish the API catalog. `origin` is required once any API sets `discovery.endpoint`:

```yaml title="docs.config.yaml"
site:
  title: Payments documentation
  origin: https://docs.example.com
```

Add masthead links:

```yaml title="docs.config.yaml"
site:
  title: Payments documentation
  header:
    links:
      - { label: Guides, href: /start }
      - { label: GitHub, href: "https://github.com/example/payments", style: button }
      - { label: Sign up, href: "https://example.com/signup", style: primary }
```

Add a footer:

```yaml title="docs.config.yaml"
site:
  title: Payments documentation
  footer:
    columns:
      - title: Guides
        links:
          - { label: Get started, href: /start }
    links:
      - { label: Privacy, href: /legal/privacy }
    text: © 2026 Example, Inc.
```

### `site.agentDiscovery`

Optional mapping. It controls the early agent guidance in HTML pages.

| Key              | Default                      | Meaning                                                                                                  |
| ---------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `mode`           | `focus`                      | Controls visual presentation and whether the block is included. See the visual and agent behavior below. |
| `label`          | `For agents`                 | Nonempty plain text before the message and links. Shoalrun adds the colon.                               |
| `message`        | None                         | Optional plain-text guidance. HTML tags are escaped; Markdown syntax stays literal.                      |
| `links.article`  | `Skip to article`            | Label for the generated `#main` link.                                                                    |
| `links.index`    | `Documentation index`        | Label for the generated `/llms.txt` link, including `site.basePath`.                                     |
| `links.markdown` | `Read this page as Markdown` | Label for the current page's Markdown twin.                                                              |

```yaml title="docs.config.yaml"
site:
  title: Payments documentation
  agentDiscovery:
    mode: visible
    label: For agents
    message: Use the Markdown version for complete examples and nested schemas.
    links:
      article: Jump to the article
      index: Browse all documentation
      markdown: Read Markdown
```

Only link labels are configurable; Shoalrun generates their destinations for each page. Labels must be nonempty strings. Unknown keys and invalid mode values fail validation and builds.

The mode controls visual presentation and whether the instruction is included:

| Value        | Visual presentation                                   | Agent reading HTML                                          |
| ------------ | ----------------------------------------------------- | ----------------------------------------------------------- |
| `focus`      | Visually hidden until a link receives keyboard focus. | The instruction and links are present in the HTML.          |
| `visible`    | Always shown as a banner.                             | The same instruction and links are present in the HTML.     |
| `disclosure` | A compact header toggle, closed initially.            | Links remain in HTML source; open it for visual navigation. |
| `off`        | No agent guidance block appears.                      | The instruction and its links are omitted from the HTML.    |

Screen readers and agents parsing raw HTML can encounter the block in all enabled modes. An agent using screenshots sees the same visual presentation as a human. Some HTML extraction tools discard visually hidden elements; the document head also provides discovery links. Visually hiding the block does not make it private.

This setting affects HTML only. It does not change the Markdown index link, generated discovery files, or the standard accessibility skip link. The focus and visible blocks follow that skip link before the header. Disclosure mode places the toggle inside the header. It is hidden in print.

### Content freshness

`site.freshness: { history: ./config/content-updates.json }` opts into persistent content-digest dates. Paths resolve from the root config directory and must stay inside the project. The first build seeds declared dates; changed content later receives today's UTC date while unchanged content retains its date. Commit the history file for reproducible clean builds. Without this setting, declared `updated` and `site.updated` remain authoritative. Native page `verified` is an independent, author-set calendar date. See [revision and verification dates](https://www.shoalrun.com/publish/seo.md).

## `theme`

Accepts `preset`, `palette`, `mode`, `toggle`, and `fonts`. See [themes](https://www.shoalrun.com/styling/themes.md), [palettes](https://www.shoalrun.com/styling/palettes.md), and [color modes](https://www.shoalrun.com/styling/color-modes.md). The build checks palette colors for WCAG contrast.

| Key       | Default                                       | Values                                                                                                                       |
| --------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `preset`  | `shoal`                                       | `shoal`, `reef`, `ledger`, `vice`                                                                                            |
| `palette` | The preset's palette                          | `kelp`, `coral`, `ink`, `harbor`, `amethyst`, `vice`, or a custom mapping                                                    |
| `mode`    | `light`                                       | `light`, `dark`, `system`                                                                                                    |
| `toggle`  | `true` with `mode: system`, otherwise `false` | `true` or `false`. `true` is allowed only with `mode: system`.                                                               |
| `fonts`   | The preset's bundled fonts                    | `system`, or a mapping of `body`, `headings`, and `code`. See Fonts in [themes](https://www.shoalrun.com/styling/themes.md). |

Change the layout and keep its colors:

```yaml title="docs.config.yaml"
theme:
  preset: ledger
```

Follow the reader's system setting and let them switch:

```yaml title="docs.config.yaml"
theme:
  preset: reef
  palette: harbor
  mode: system
```

Use a built-in palette as a base and change the brand colors:

```yaml title="docs.config.yaml"
theme:
  palette:
    extends: harbor
    light: { accent: "#0a6a48", link: "#0a6a48" }
    dark: { accent: "#4fd6a4", link: "#7fe0bd" }
```

Use dark mode only, without a switch:

```yaml title="docs.config.yaml"
theme:
  mode: dark
```

## Related reading

### Read first

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Learn how files combine and how to validate configuration changes.

### Reference while working

- [Configuration reference](https://www.shoalrun.com/config.md) — Find configuration settings in another topic.
