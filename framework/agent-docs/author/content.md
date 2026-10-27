---
id: guide.content-identity
title: Content and stable IDs
summary: Give each page a durable identity and publish explicit variants.
type: explanation
area: authoring
subarea: authoring-pages
canonical: /author/content
---

# Content and stable IDs

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Content and stable IDs

**Updated: 2026-10-26.**

Author pages as `.md` or `.mdx` under the content directory, `site.contentDir` (default `content`, relative to `docs.config.yaml`). The build parses and validates every `.md` and `.mdx` file there, drafts included, so a stray README without frontmatter fails the build. The `id` identifies a document independently of its filename, title, slug, and navigation position. A page's `slug` sets its public route. The compiler rejects route collisions and duplicate IDs within a publication variant.

Keeping identity separate from location lets the documentation grow without reconnecting every reference. A filename is an authoring choice; a slug is a reader's address; the ID is the lasting connection used by links, navigation, and relationships. Renaming a page can leave its ID intact even when its URL needs a redirect.

```yaml
---
id: guide.example
title: Example guide
summary: A short description for navigation and discovery.
type: guide
slug: /guides/example
channel: production
version: current
access: { policy: public }
---
```

Publication channel, API version, and language are separate axes. Published pages need channel and version, supplied on the page or through [global frontmatter](https://www.shoalrun.com/author/frontmatter.md). Language uses global frontmatter defaults/enforced values first, then `publications.defaults.language`, then `en`. An explicit page language overrides that default. Enabled publication entries can also omit language to inherit the same default; the project config declares supported combinations and route prefixes. Nonpublic pages are excluded before rendering. The prototype does not yet provide hosted role-based access control.

Link to another document by ID with `[the guide](doc:guide.example)` or `<DocLink doc="guide.example">the guide</DocLink>`. These become the current route in HTML and the corresponding `.md` route in Markdown. A slug or filename change leaves ID-based links intact. Unknown IDs fail the build.

The current MDX semantic adapters cover GitHub Flavored Markdown and the elements in the [component reference](https://www.shoalrun.com/author/components.md), including [diagrams](https://www.shoalrun.com/author/components/diagrams.md). Dynamic expressions and unknown components fail because they cannot yet be represented faithfully in both HTML and Markdown. See [published outputs](https://www.shoalrun.com/publish/output.md) for what an agent receives.

Set the root language once, for example:

```yaml
publications:
  defaults: { channel: production, version: current, language: fr }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }
    - { channel: production, version: current, language: de }
```

Pages without `language` use French at their ordinary route. A page with `language: de` uses the German publication and a `/de` route prefix.

## Related reading

### Read first

- [How Shoalrun works](https://www.shoalrun.com/concepts.md) — See how IDs, slugs, and routes fit into the build.

### Next steps

- [Page metadata](https://www.shoalrun.com/author/frontmatter.md) — Add the metadata fields each page needs after inheritance.

- [Organize site navigation](https://www.shoalrun.com/author/navigation.md) — Place the page in the site menu.

### Related topics

- [DocLink](https://www.shoalrun.com/author/components/doc-link.md) — Link to pages by stable ID so links survive slug changes.
