---
id: reference.config
title: Configuration reference
summary: Every top-level setting in docs.config.yaml, with defaults, validation
  rules, and links to the full guides.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config
---

# Configuration reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference

**Updated: 2026-10-20.**

Parent page: [Full Markdown page](/config.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [How Shoalrun works](https://www.shoalrun.com/concepts.md) — Understand publications, stable IDs, and config composition before changing settings.

A project's config starts at `docs.config.yaml`. The CLI looks for that name by default, and `shoalrun scaffold -n` searches parent directories for it. For the configuration workflow, composition rules, and debugging, start with [configure your project](https://www.shoalrun.com/configuration.md). This page lists every top-level key. Keys with a dedicated guide link there for the full rules. For complete, working configs, see [example configs](https://www.shoalrun.com/config/examples.md).

The root file must be a YAML mapping with `schemaVersion: 1`. YAML is parsed strictly: duplicate keys fail. Any top-level key not listed here fails with `unknown setting <key>`. Keys nested inside `site`, `apis`, `publications`, and `outputs` are not all checked yet, so check spelling there carefully.

```yaml title="docs.config.yaml"
schemaVersion: 1
site:
  title: Example documentation
publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }
navigation: { $include: ./config/nav.yaml }
```

## `site`

Required.

| Key              | Default                                  | Meaning                                                                                                                                                                                                                                         |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`          | None                                     | Site name in the masthead and the heading of `/llms.txt`.                                                                                                                                                                                       |
| `contentDir`     | `content`                                | Page directory, relative to the root config file. Every `.md` and `.mdx` file in it is read.                                                                                                                                                    |
| `basePath`       | `""`                                     | Mount point for public pages and resources, such as `/docs`. Use URL path segments without escapes or dot segments. Build tools keep internal manifests at the output root; the public site is also complete inside the `docs/` output subtree. |
| `origin`         | None                                     | The site's HTTPS origin, such as `https://docs.example.com`, with no path or trailing slash. Required to publish the API catalog, and makes link-preview URLs absolute.                                                                         |
| `indexing`       | `true`                                   | Set `false` on previews to add noindex to pages, disallow crawling in `robots.txt`, and omit the XML sitemap.                                                                                                                                   |
| `updated`        | None                                     | Optional YYYY-MM-DD fallback for sitemap `lastmod`, especially on generated API pages. Page `updated` overrides it.                                                                                                                             |
| `favicon`        | A mark drawn from the preset and palette | A local `.svg` or `.png` file. See [share images and favicon](https://www.shoalrun.com/styling/share-images.md).                                                                                                                                |
| `customCss`      | None                                     | A local `.css` file linked after the framework styles. See [CSS](https://www.shoalrun.com/author/css.md).                                                                                                                                       |
| `editionBadge`   | `auto`                                   | Masthead publication label: `auto` shows only the channel, version, or language values that differ across publications; `always` or `never`.                                                                                                    |
| `header.links`   | None                                     | Masthead links. See [header](https://www.shoalrun.com/styling/header.md).                                                                                                                                                                       |
| `agentDiscovery` | Visually hidden until focused            | HTML agent guidance, visual presentation, and link labels. See `site.agentDiscovery` below.                                                                                                                                                     |
| `footer`         | None                                     | Footer `columns`, bottom-row `links`, and a `text` line. See [site footer](https://www.shoalrun.com/styling/footer.md).                                                                                                                         |

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
