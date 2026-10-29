---
id: guide.markdown-metadata
title: Markdown metadata
summary: Public field projection, source paths, profiles, precedence, and
  required values.
type: reference
area: authoring
subarea: authoring-metadata
canonical: /author/markdown-metadata
---

# Markdown metadata

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Page metadata > Markdown metadata

**Updated: 2026-10-28.**

The build publishes [the page metadata guide as Markdown](https://www.shoalrun.com/author/frontmatter.md) alongside its HTML page. That `.md` file starts with a YAML header containing selected values from the source page header. Source headers can grow long and contain review notes or other details that do not help an agent read the page. Selecting a small set of useful fields keeps the agent's context focused and avoids exposing internal metadata in that header. Compare the two custom values in that guide's source:

```yaml title="docs/content/frontmatter.mdx"
agent:
  intent: Help authors understand and configure page metadata.
editorial:
  reviewNote: Check the frontmatter examples before release.
```

The generated `.md` header includes `agent.intent` but leaves out `editorial.reviewNote`:

```yaml title="docs/dist/author/frontmatter.md"
---
id: guide.frontmatter
title: Page metadata
summary: Set page identity, publication, and presentation fields before publishing.
description: Learn how page metadata, project defaults, and publication choices
  shape the site and its Markdown output.
type: reference
audiences:
  - authors
  - maintainers
canonical: /author/frontmatter
agent:
  intent: Help authors understand and configure page metadata.
---
```

The `agent.intent` value appears because this site's `docs/docs.config.yaml` selects it for `reference` pages. The relevant settings are:

```yaml title="docs/docs.config.yaml"
outputs:
  markdown:
    metadata:
      format: yaml-frontmatter
      fields:
        id: frontmatter.id
        title: frontmatter.title
        summary: frontmatter.summary
        description: frontmatter.description
        type: frontmatter.type
        audiences: frontmatter.audiences
        subjectLifecycle: frontmatter.subjectLifecycle
        canonical: publication.canonicalUrl
      omitNull: true
      byType:
        reference:
          addFields:
            agent.intent: frontmatter.agent.intent
```

Each entry under `fields` names an output key on the left and its source on the right. Here `summary` and `description` stay separate, while `audiences` comes from the page's intended-reader labels. The `byType.reference` rule adds `agent.intent` only for pages whose `type` is `reference`. `subjectLifecycle` is absent from the example output because that guide has no subjectLifecycle value and `omitNull` is true.

The review note is absent because its declaration sets `public: false` and the output config does not select it. This controls only the generated YAML header: text written in the page body still appears in the published Markdown and HTML.

Keep this header short. Include the fields an agent needs for the page, and leave out long descriptions or notes that take up its context.

### Projection settings

`format` must be `yaml-frontmatter` to write a header. It defaults to `none`, so a projection with `fields` but no `format` writes no header and reports no error. `format: none` removes the header while leaving the full page body in Markdown.

A field source is either `frontmatter.<path>` or one of these publication values:

| Source                     | Value                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `publication.channel`      | The page's publication channel.                                                          |
| `publication.version`      | The page's publication version.                                                          |
| `publication.language`     | The page's language.                                                                     |
| `publication.canonicalUrl` | The page route, such as `/author/frontmatter`. It is site-relative, not an absolute URL. |

Built-in public fields can be selected directly. A custom field needs a declaration with `public: true`. The protected roots `access`, `seo`, `markdownMetadata`, `variables`, `tocDepth`, `private`, `internal`, `card`, and `displayText` cannot be selected under any name. With `omitNull: false`, a missing value fails the build instead of being skipped.

Layers apply in order. The base settings come first, then `byType.<type>`, then a named profile, then the page's own override. Each layer accepts `format`, `fields`, `addFields`, `removeFields`, and `omitNull`. `fields` replaces the inherited fields; `addFields` merges into them; `removeFields` drops output names and fails if a name is missing.

Define named profiles under `profiles`, then select one from a page:

```yaml title="docs.config.yaml"
outputs:
  markdown:
    metadata:
      format: yaml-frontmatter
      fields: { id: frontmatter.id, title: frontmatter.title }
      profiles:
        minimal:
          removeFields: [title]
```

```yaml title="A page's frontmatter"
markdownMetadata: minimal
```

A page can also write the override as a mapping, such as `markdownMetadata: { profile: minimal, addFields: { language: publication.language } }`. The example API project under `framework/example/` uses the same declaration and projection pattern.

See [the generated frontmatter reference](https://www.shoalrun.com/author/frontmatter-reference.md) for the local project field inventory. See [cards and collections](https://www.shoalrun.com/author/components/cards.md) for card inheritance and collection filters, and [related reading](https://www.shoalrun.com/author/related-reading.md) for authored reading paths.

### Put a field on every page

List the field under `fields` at the top level of `outputs.markdown.metadata`. Top-level `fields` apply to every page. A `byType` rule adds fields only for pages of that type, so use it for extras and not for a field that every page needs.

To require the value as well, declare the field with `required: true`. A page that lacks it then fails the build, and the error names the file:

```yaml title="docs.config.yaml"
frontmatter:
  fields:
    agent.intent:
      type: string
      description: The reader task this page helps an agent complete.
      public: true
      required: true

outputs:
  markdown:
    metadata:
      format: yaml-frontmatter
      fields:
        id: frontmatter.id
        title: frontmatter.title
        summary: frontmatter.summary
        type: frontmatter.type
        canonical: publication.canonicalUrl
        agent.intent: frontmatter.agent.intent
```

Each page then writes its own value:

```yaml title="A page's frontmatter"
agent:
  intent: Help a reader install Acme.
```

Every Markdown copy carries the field, one copy for each publication the page is in. Without `required: true`, a page that lacks the value is skipped when `omitNull` is true and fails the build when it is false. A shared default from `frontmatter.defaults` also satisfies `required: true`.

## Published Markdown size

Each page record in `documents.json` and `search-index.min.json` includes `markdownBytes`, `markdownTokens`, and `markdownTokenEncoding`. Bytes count the complete published `.md` file as UTF-8, including its metadata, navigation links, reader labels, and final newline. Tokens count that same text using `cl100k_base`; special-token spellings are treated as ordinary text. This count is specific to that encoding, not a universal model budget.

Use the record's `markdownUrl` and publication coordinates to select the file. The manifest's `digest` remains the SHA-256 of those exact Markdown bytes. Counts live outside the Markdown itself, avoiding a self-referential size field. The compact index still omits article text and reader segments.

## Declare sections that can be read alone

For a section that is complete without the page introduction, use its ID and an explicit context:

```yaml
standaloneSections:
  - { id: try-the-page-controls, context: section }
```

This declaration approves the section for contextual discovery and for section-only content export. Exporting it still requires selection in an export target. Review the section alone: its required setup, definitions, warnings, and steps must be present. If it depends on other parts of the page, leave it undeclared and use a full-page read.

Search recommends a declared section only when its heading uniquely matches the query and the section meets size requirements. Discovery files still repeat the page introduction and reading-path context; the object does not change that response format.

This field is page-specific; site defaults and enforced values cannot set it. Each ID must match exactly one root-level H2 heading. Missing or duplicate declarations fail the build, even on short pages. The compiler checks identity and size eligibility; it cannot verify the author's claim about completeness. Re-review declarations when content or prerequisites change.

### Compatibility with contextual-only approvals

Older declarations use exact heading titles, such as `standaloneSections: [Try the page controls]`. They approve a discovery read with its repeated page context, not a section-only export. Keep existing declarations when the section depends on that context. The [compatibility guidance](https://www.shoalrun.com/content-delivery/sections.md) explains the review required before changing to an ID-based object.

Omitting the list, using an empty list, or reading an older search index makes search use full pages for those headings. Size eligibility still applies to declared headings. Undeclared resources remain available through outlines and explicit section reads for callers that already have the context. Fetch-only consumers should require `standalone: true` before automatically choosing a section. A declaration does not guarantee relevance to every question; use the full-page fallback for broader tasks.

## Fetch one section

The section resources described here are contextual agent reads. [Content delivery](https://www.shoalrun.com/content-delivery/agents.md) provides separately approved application fragments. Its ID-based approval does not change the meaning of existing title declarations.

Each page record in `documents.json` now includes a `sections` outline. Entries describe top-level level-two headings in the normalized content tree. A section includes its nested headings and components through the next top-level heading of the same or higher level. Headings inside tabs, reader sections, lists, or disclosures do not become separate resources. Section files are generated only when the full page has at least 2,000 `cl100k_base` tokens and the complete section, including repeated context, uses at most half the page’s bytes and tokens. Other pages and sections use the full Markdown page; their outlines can be empty.

Fetch the entry's `markdownUrl` for a complete section file. For example, the agent-friendliness page has a section at `/publish/agent-friendliness.sections/try-the-page-controls.md`. These are real static resources: adding `#heading` to the full page URL does not make an HTTP request smaller. The compact search index includes eligible section titles, URLs, sizes, and standalone declarations, so fetch-only agents can select them without downloading the full manifest. The short `llms.min.txt` index lists full pages and nests only author-declared standalone section links, with exact sizes and a **Full page** fallback. A fetch-only agent can use those text links without reading JSON or calling a search tool.

Each file repeats the parent's projected metadata, title, publication dates, navigation, introductory content, and fictional-content notice when present. It then includes the selected section with all nested reader labels and code fences. Top-level current-page `RelatedReading` prerequisites and next steps omitted by the section boundary are included as a labeled **Page reading path**, without duplicating links already in the selected content. Nested or other-page relationship views remain in their original scope; see [reading paths](https://www.shoalrun.com/author/related-reading.md). Shared reference definitions are retained. Local fragment links point back to the full parent Markdown page. Section files are complete representations, not byte slices of the parent.

| Outline field                                              | Meaning                                                                                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `standalone`                                               | Present as `true` only when the author declares the section self-contained. Absence means search recommends the full page. |
| `id`, `title`, `depth`                                     | Generated section ID, heading text, and level two.                                                                         |
| `markdownUrl`                                              | Fetch URL and citation for the section resource.                                                                           |
| `parentMarkdownUrl`, `parentDigest`                        | Full page URL and SHA-256 digest of its published Markdown.                                                                |
| `digest`                                                   | SHA-256 of the complete section file.                                                                                      |
| `markdownBytes`, `markdownTokens`, `markdownTokenEncoding` | Exact section size, using the same UTF-8 and `cl100k_base` rules as page metadata.                                         |

Section IDs use normalized lowercase title text, ASCII letters and digits, and hyphens, limited to an 80-character stem. A title with no usable characters uses `section`. Collisions receive suffixes beginning with `-2` in document order. These IDs are not permanent: renaming, inserting, or reordering headings can change them. Cite the stable page ID, publication coordinates, section ID, section URL, and both digests. The surrounding manifest supplies the page identity, publication, and build ID.

From the repository root, inspect and read the agent-friendliness example's sections with the local CLI:

```sh
npx --no-install shoalrun docs outline guide.agent-friendliness --max-tokens 10000
npx --no-install shoalrun docs section guide.agent-friendliness try-the-page-controls --max-tokens 10000
```

For ordinary retrieval, start with `docs search` and follow the result’s `read` instruction; the outline command is optional. Search returns a recommended `markdownUrl` and a `pageMarkdownUrl` fallback. Both commands above return JSON. Select `--channel`, `--version`, and `--language` when a page has multiple publications. The outline and section must fit the requested token budget in full; increase `--max-tokens` when they do not. Section reads verify the file digest and its link to the parent record. [MCP clients](https://www.shoalrun.com/publish/mcp.md) can use `get_outline` and `get_section` for the same operations. Rebuild older sites to add section resources.

## Related reading

### Reference while working

- [Frontmatter field reference](https://www.shoalrun.com/author/frontmatter-reference.md) — Check native fields and the current project declarations.
