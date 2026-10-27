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

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Generated outputs

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/publish/output.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md) — See how these files help agents discover and read the site.

`shoalrun build` turns accepted source pages and local OpenAPI files into a static site. A **publication** is one enabled channel, version, and language combination, such as production, v1, and English. The build includes a public page only in publications matching its frontmatter. It makes no model calls or remote requests.

For each included page, the build writes an HTML page for browsing. It also writes a **Markdown twin**, a generated `.md` copy that agents can read as text. The Markdown twin can start with a short YAML header. That header contains only the page metadata selected in project config, so agents get useful context without a long source header or internal notes. Shared content appears in both bodies; authors can also add content to either format alone with [Only](https://www.shoalrun.com/author/components/only.md).

The site also includes a **document manifest**, `documents.json`, which indexes the built pages and their URLs. Projects with an API source can publish operation pages and **focused contracts**, small OpenAPI files containing one operation and the definitions it needs.

## Published-output contract

This page is the consumer reference for Shoalrun's current published output. It describes the existing producer, not a general format that other generators must implement. The manifest and sync snapshot use `schemaVersion: 1`. Editorial revisions to this reference do not change that wire version.

The repository maintains JSON Schema 2020-12 definitions at `framework/schemas/manifest.schema.json` and `framework/schemas/sync.schema.json`. They specify required fields and known value shapes; this reference explains their meaning. Schema identifiers are stable names for local resolution, not a promise that a site hosts the schema files. Register both schemas together when validating a sync snapshot. They remain repository validation resources and are not added to site output.

Consumers must tolerate unknown properties. Optional fields may be absent; absence is not evidence of a negative claim. Removing a required field, changing a field's meaning, or making existing valid output incompatible requires a new wire version. Adding optional fields can retain version 1. Changes to a constrained value set also need compatibility review; accepting unknown properties does not mean a consumer accepts unknown enum values.

| Capability                                                                                                        | Availability                                                                                        |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| HTML and Markdown pages                                                                                           | Every included public page has both representations.                                                |
| Manifest, sync snapshot, build information, response headers, redirect inventory, and both text discovery indexes | Emitted by the build. Empty inventories are allowed.                                                |
| Search indexes                                                                                                    | Both full and compact indexes are emitted when search indexing is enabled.                          |
| Section resources                                                                                                 | Emitted only for eligible sections of sufficiently long pages.                                      |
| Focused contracts and published API sources                                                                       | Emitted when configured for an API source.                                                          |
| Sitemap                                                                                                           | Requires a site origin and enabled indexing.                                                        |
| Markdown negotiation, redirect responses, caching, and HTTP 404 status                                            | Hosting behavior; the Node server and Vercel adapter implement it. Other hosts need matching rules. |

Routes include the configured base path and publication prefixes. Start at `llms.min.txt` under that base path, follow a matching topic index when present, then choose a page by its ID, title, and summary and fetch its Markdown URL. Fetch the manifest when you need structured metadata. Each compact index is limited to 2,000 `cl100k_base` tokens; total discovery cost depends on the number of indexes you read.

A document's identity is `(id, channel, version, language)`, not its title, URL, or array position. The same ID in two publications identifies two records. That tuple must be unique in both the manifest and sync snapshot. Cite it with the resource URL; for sections, also retain section identity and parent/section digests. A manifest array pointer is a link into that snapshot, not a permanent document identifier.

`indexable` describes indexing, not access. `demo: false` means unmarked, not a verified service. Missing or null `subjectLifecycle` does not mean stable. `verified` is an author's review date, not compiler or independent verification. `updated` records content freshness and can be a calendar date or a timestamp with a timezone. Reader filters control presentation, not authorization.
