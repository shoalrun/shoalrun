---
id: guide.content-delivery-selection
title: Select content resources
summary: Choose pages, approved sections, and named snippet instances for a
  portable export.
type: how-to
area: publishing
subarea: publishing-content-delivery
subjectLifecycle: in-development
canonical: /content-delivery/select
---

# Select content resources

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Content delivery > Select content resources

**Updated: 2026-10-28.**

**Status: In development.**

Use an export target to choose exactly which content an application receives. Work from a Shoalrun project with public pages in an enabled publication. Whole pages need no section declaration. To export just one section, first read it without the rest of its page and check that it includes the context needed to understand or follow it. Record that review in the source page's `standaloneSections` frontmatter; [declare a section ready for separate use](https://www.shoalrun.com/content-delivery/sections.md) explains why and shows the syntax.

The declaration says the section can be used on its own. The export target below says which content to include in this bundle. Both are required for a section export.

## Define the target

Add this target to `docs.config.yaml`. Replace the example IDs with your own:

```yaml
exports:
  application:
    formats: [html, markdown]
    publicBase: /content/revisions/r1/
    publication: { channel: production, version: current, language: en }
    resources:
      - { kind: page, documentId: guide.account }
      - { kind: section, documentId: guide.billing, sectionId: refunds }
      - kind: snippet
        id: refund.standard
        snippetId: refund-window
        title: Refund window
        summary: Time available to request a refund.
        values: { days: 30 }
```

`resources` and the older `documents` selection are mutually exclusive. A page selector includes the complete page. A section selector includes its approved H2 and nested subsections, ending at the next H2 or H1. The export retains applicable notices and referenced definitions without copying ordinary page introduction text.

A requested page must be public and available in the chosen publication. An export `contentFilter` can narrow eligible pages; it is independent of website navigation and `site.contentFilter`. Reader filters select content, not access permissions.

## Name snippet instances

Register reusable snippet source in the project's existing `snippets` configuration:

```yaml
snippets:
  refund-window:
    file: ./snippets/refund-window.mdx
    variables:
      days: { type: number, required: true, default: 14 }
```

The snippet file contains:

```mdx
Request a refund within <Var name="days" /> days.
```

`snippetId` chooses that source; `id` names the exported instance. Multiple instances can use different literal values. The application reads `refund.standard`, not a runtime template. Instances have no containing page or page variables. Page-dependent components and headings are not supported in standalone snippets.

## Export and inspect

```sh
npx --no-install shoalrun export docs.config.yaml \
  --target application --out ./content-release
```

Inspect `manifest.json`, each selected representation, and its referenced assets. Unknown references, missing approval, and unsupported content fail before replacing an existing export. Imported API material still follows the existing source-review gate.

Links to fragments in unselected pages fail export because their anchors cannot be verified. Select the target page or section explicitly. Missing or ambiguous fragments also fail. A sliced section keeps its full-source heading identity. Links to sibling content can use a canonical page URL only when the source HTML anchor is verified.

## HTML, Markdown, and agents

Both formats receive the selected resources, with their own links and anchor metadata. Tabs and reader-marked content become complete labeled text. A fragment with no substantive content in a requested representation fails export. Agents can inspect the exact resource references and publication in the manifest instead of inferring meaning from a filename.

## Related reading

### Read first

- [Content delivery](https://www.shoalrun.com/content-delivery.md) — Understand resource delivery and its application boundary. (Status: in development.)

### Related topics

- [Content delivery](https://www.shoalrun.com/content-delivery.md) — Choose which resources the application receives. (Status: in development.)

- [Section identity and compatibility](https://www.shoalrun.com/content-delivery/sections.md) — Approve section slices and preserve their references. (Status: in development.)

- [Read content with a client](https://www.shoalrun.com/content-delivery/client.md) — Read a reviewed export from an application. (Status: in development.)
