---
id: guide.component.for-facet
title: ForFacet
summary: Include additional sections in selected builds using configured reader facets.
type: reference
area: components
subarea: components-prose
canonical: /author/components/for-facet
---

# ForFacet

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Components > ForFacet

**Updated: 2026-11-07.**

**Available since: 1.1.0.**

`ForFacet` selects sections during a build using the same facets as `contentFilter`. It matches any facet declared in `readerFilters.facets` and its configured choices. A shared customer page with additional internal instructions is one example. You don't need a customer profile or feature manifest. **Unmarked sections remain included. Pages without a mark for a selected facet are excluded.** A section guard can't restore an excluded page.

## Syntax

Declare the choices in your project config:

```yaml
readerFilters:
  facets:
    audience:
      label: Audience
      options: { customer: Customers, internal: Internal, partner: Partners }
    region:
      label: Region
      options: { eu: Europe, us: United States }
site:
  contentFilter: { audience: [customer] }
```

Give a shared page all applicable page-level marks, then wrap only the additional content:

```mdx
---
id: guide.billing
title: Billing
summary: Understand billing and operational checks.
type: guide
slug: /billing
audiences: [customer, internal]
---

Everyone receives these billing instructions.

<ForFacet audience="internal">

## Operational checks

Check whether the original request completed before replaying a failed job.

</ForFacet>

Everyone receives these support instructions.
```

The customer build omits **Operational checks** and its instructions. A build with `audience: [internal]` includes them. A build without `contentFilter` includes all valid blocks and all otherwise eligible pages.

## Attributes

Each attribute names a facet declared in `readerFilters.facets`. Its required value is a nonempty literal string of configured choice IDs separated by whitespace. The block needs at least one facet attribute and body content. Unknown facets or choices, duplicate attributes or choices, empty values, expressions, and spread attributes fail validation, even inside an excluded ancestor.

| Rule                          | Example                                            | Result                          |
| ----------------------------- | -------------------------------------------------- | ------------------------------- |
| Alternatives within one facet | `audience="internal partner"`                      | Either selected choice matches. |
| Every facet must match        | `audience="internal" region="eu"`                  | Both conditions must pass.      |
| Unselected facet              | `region="eu"` when the build only selects audience | The region condition passes.    |
| No build filter               | Any valid block                                    | The block is included.          |
| Nested guards                 | A ForFacet inside another ForFacet or ForFeature   | Every ancestor must pass.       |

A build selecting `audience: [customer, internal]` includes either audience's blocks. This feature adds information to selected builds; it doesn't replace one version with another. An unfiltered build includes both a customer block and an internal block. Exclusion attributes and arbitrary expressions aren't supported.

## Choose the right section component

Choose according to whether the content must be omitted from the build or hidden in a browser view.

| Component       | Purpose                                   | Content in published files                       |
| --------------- | ----------------------------------------- | ------------------------------------------------ |
| `ForFacet`      | Build-time selection by configured facets | Unmatched blocks are omitted.                    |
| `ReaderSection` | Browser reader-view convenience           | All blocks remain published, including Markdown. |
| `ForFeature`    | Feature grants from a customer profile    | Unmatched blocks are omitted under that profile. |

`ForFacet` uses whitespace-separated choices. `ReaderSection` uses comma-separated choices. A retained ReaderSection that mentions a build-selected facet produces the warning `reader-section-build-facet`. Review that warning when content should be omitted from the artifact.

## Exports and private selection reports

A portable [content export](https://www.shoalrun.com/publish/content-export.md) uses its own target's `contentFilter`, independently of the website. Set that filter explicitly when an application export must omit internal sections. When section filters differ, canonical fragment fallback fails. The export tree can't prove that the website publishes the same anchor. Include the target resource in the export or link to its page URL without a fragment. [PDF exports](https://www.shoalrun.com/publish/pdf.md) use the target's filter or inherit the site's filter when the target doesn't specify one.

After a successful build or export, `.shoalrun/content-selection.json` identifies the artifact, effective selection, section decisions, and warnings. Its `receipt` field points to the artifact-specific copy in `.shoalrun/content-selection/`. A later build replaces the latest receipt, including when it has no filter. These reports contain source locations and conditions, not section prose; keep them outside served output.

## HTML, Markdown, and agents

Selection happens before headings, anchors, tables of contents, dependency expansion, and rendering. An excluded block contributes no body, heading, snippet expansion, API embed, or referenced image to that artifact. Its text doesn't appear in the site's HTML, Markdown twins, search and passage indexes, or discovery content. Retained content renders normally; ForFacet adds no browser control or JavaScript requirement. Application clients receive the selected export's rendered content.

Globally configured snippet files and component plugins still load and validate. Facet choice catalogs remain public configuration. A separately published OpenAPI contract isn't redacted by removing an API embed. Protect a private deployment with host authentication, and review each separately generated artifact's selection before distributing it.

## Check both builds

Build filtered and unfiltered outputs into separate directories. Check HTML and Markdown for the added instructions, and search the customer output for a distinctive phrase from the excluded section. Check application exports separately. The packaged `example-configs/facet-sections` example provides a complete page and two entry configs for this comparison.

### Test for content crossing builds

Use a small fixture with unique text, heading, snippet, image, and API-example markers inside guarded sections. Confirm each marker appears in a build that includes it, then scan every file in the excluded output for it. Checking both presence and absence prevents a broken fixture from producing a false pass.

Cover the outputs you distribute: HTML and Markdown, search and discovery data, MCP runtime copies, application exports, and PDF preparation. Decode base64 asset payloads and extract text from generated PDFs; a plain text scan can't inspect compressed or encoded content. Check each export target's own selection explicitly.

Interleave builds for different audiences and products in one process. Rebuild a previously broader output with a narrower filter in a temporary directory to check stale-file removal. Confirm sibling output directories remain unchanged and shared document/snippet IDs retain the correct publication scope. Keep production output directories separate, and stop deployment when any build or isolation check fails.

## Related reading

### Next steps

- [Build separate sites from shared content](https://www.shoalrun.com/publish/single-source-sites.md) — Build separate sites with page and section selection from shared source.

### Reference while working

- [Reader views](https://www.shoalrun.com/author/reader-views.md) — Compare build-time omission with browser visibility controls.
