---
id: guide.output
title: Publishing and agent representations
summary: Read the published-output contract for HTML, Markdown, manifests, and
  incremental sync.
type: reference
area: publishing
subarea: publishing-builds
canonical: /publish/output
---

# Publishing and agent representations

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Generated outputs

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/publish/output.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) — See how these files help agents discover and read the site.

`shoalrun build` turns accepted source pages and local OpenAPI files into a static site. A **publication** is one enabled channel, version, and language combination, such as production, v1, and English. The build includes a public page only in publications matching its frontmatter. It makes no model calls or remote requests.

For each included page, the build writes an HTML page for browsing. It also writes a **Markdown twin**, a generated `.md` copy that agents can read as text. The Markdown twin can start with a short YAML header. That header contains only the page metadata selected in project config, so agents get useful context without a long source header or internal notes. Shared content appears in both bodies; authors can also add content to either format alone with [Only](https://www.shoalrun.com/author/components/only.md).

The site also includes a **document manifest**, `documents.json`, which indexes the built pages and their URLs. Projects with an API source can publish operation pages and **focused contracts**, small OpenAPI files containing one operation and the definitions it needs.

## Where files go

`shoalrun build <config> <output>` writes the site to the output directory. It builds in a temporary directory, then **deletes the output directory and replaces it**, so point it at a directory that holds only build output. To protect other folders, it replaces a directory only when it is new, empty, or an earlier build. Otherwise the build stops before deleting anything.

| Output                     | Path                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTML page                  | `<route>/index.html`                                                                                                                                     |
| Markdown twin              | `<route>.md`; a page at `/` gets `/index.md`                                                                                                             |
| Framework and theme assets | `/assets/`: `site.css`, `tokens.css`, `header.css`, scripts, `themes/`, and, when used, `theme.css`, `palette.css`, `project.css`, and `theme-preview.*` |
| Diagram images             | `/assets/diagrams/<engine>-<hash>-light.svg` and `-dark.svg`, named by a hash of the source so identical diagrams share a file                           |
| Published OpenAPI source   | `/api/<apiId>/<channel>/<version>/<file>`, plus the local files it references                                                                            |
| Focused contracts          | `/api/operations/<channel>/<version>/<language>/<name>-<hash>.json`                                                                                      |

The `/api` and `/.well-known` paths are reserved for these files, so page slugs cannot use them. A [diagram](https://www.shoalrun.com/author/components/diagrams.md) in the Markdown twin keeps its title, summary, a link to the light SVG, and its fenced source.
