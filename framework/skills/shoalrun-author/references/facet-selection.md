# Build-time facet selection

ForFacet requires Shoalrun 1.1.0 or newer. Check the installed compiler's support before using `<ForFacet>`; an older bundled documentation snapshot doesn't establish availability. Use `readerFilters.facets` to declare choices, `site.contentFilter` to select a site's pages, and `<ForFacet>` to omit unmatched sections. No customer profile or SKU manifest is needed.

**Unmarked sections remain included. Pages without a mark for a selected facet are excluded.** Give a shared page all applicable page-level marks; a section guard can't bring an excluded page back.

```yaml
readerFilters:
  facets:
    audience:
      label: Audience
      options: { customer: Customers, internal: Internal }
site:
  contentFilter: { audience: [customer] }
```

```mdx
---
id: guide.billing
title: Billing
summary: Understand billing and operational checks.
type: guide
slug: /billing
audiences: [customer, internal]
---

Shared billing instructions.

<ForFacet audience="internal">

## Operational checks

Check the retry queue before replaying failed jobs.

</ForFacet>
```

Every authored facet must match; whitespace-separated choices within an attribute are alternatives. An unselected facet passes automatically. No build filter includes every valid block. Nested guards AND, including `<ForFeature>` guards. Only literal positive matches are accepted; don't invent expressions, exclusions, or replacement semantics. An unfiltered build contains both blocks if an author writes separate customer and internal versions.

`<ReaderSection>` uses comma-separated choices and only changes browser visibility: its content still ships. A retained ReaderSection using a build-selected facet produces `reader-section-build-facet`; check whether the author intended omission. Don't suppress the warning by relabeling private content.

Portable export targets select independently of the website: give each target its own `contentFilter` when it must omit sections. PDF exports inherit the site's filter unless the target overrides it. Check the exact site, export, and PDF selection rather than assuming one site's result proves every artifact.

Validate both a filtered build and an unfiltered build. Confirm the extra text and headings are absent from the filtered HTML, Markdown, discovery/search output, and copied assets. Check snippet instances and application exports when affected. Excluded guards still validate their facet names and choices, including nested excluded branches, but their ordinary snippet/API/image invocations don't expand. Globally registered snippet files and plugins still load and validate.

Read the private `.shoalrun/content-selection.json` receipt for the last successful artifact's decisions and warnings. Its target identifies which artifact was selected; the `receipt` path points to the artifact-specific copy. Keep these reports out of served files. Facet catalogs and separately published API contracts aren't redacted by removing a section. Build-time omission isn't deployment authentication.

For selection changes, use an isolated canary fixture: unique text, heading, snippet, image, and API markers must appear in their included artifact and be absent from every excluded artifact. Scan all distributed files, not just article HTML; decode prepared-PDF asset payloads and inspect generated PDF text when those outputs are enabled. Interleave audience/product builds and independently filtered exports, check publication-scoped snippet metadata, and verify an unchanged sibling output plus broad-to-narrow replacement in a temporary directory. Never deploy a retained last-good artifact after a failed build for a different selection.
