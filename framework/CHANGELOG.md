# Changelog

## 0.1.0-alpha.14 — 2026-10-30

- Keep selected text readable in light and dark modes by pairing the selection
  background with its contrasting foreground color.
- Let paragraphs and ordinary lists fill their containers in wide, landing, and
  splash layouts, including nested sections. Standard pages retain the 68ch
  reading measure; hero text and other components keep their own limits.

Upgrade to alpha.14 and rebuild your site to receive these styling fixes.

## 0.1.0-alpha.13 — 2026-10-28

Use documentation as content for applications, agents, services, and publishing
workflows. Content delivery adds selected sections and named snippet instances to
whole-page exports, with a shared client interface for static bundles and REST.

- Read reviewed HTML or Markdown with `@shoalrun/cli/content`. The mount helper
  rewrites IDs and links so the same content can appear more than once in an app.
- Use heading-derived section IDs or preserve a reference with a trailing
  `<Anchor id="refunds" />`. Declare `{ id: refunds, context: section }` in
  `standaloneSections` after reviewing that section without the rest of its page.
- Serve the same snapshots with `createContentRestHandler` and read them with
  `openRestContentSource`. HTTP contract v1 covers resource lists, metadata,
  representations, explicit publication and revision selection, and ETags.
  Authentication, search, editing, and production hosting remain host concerns.
- Compare exports using `--previous-manifest`; add `--fail-on-removed` to reject
  removed references. Use immutable revision directories for running clients.
- Render schema-based OpenAPI response headers in native API references. Generated
  request samples handle HEAD responses and text representations correctly.
- Show authored `verified` dates as labeled semantic dates in HTML page headers,
  independently of `updated`. Set `showVerified: false` on a page or through
  frontmatter defaults to hide verification in HTML only. Builds never assign it.
- Find content-delivery guides, client and HTTP references, and clearer layout
  choices in the bundled docs. The layout guide explains `layout: wide` versus
  `tocDepth: 0`; section guidance explains what the author declaration means.

- Preserve literal scaffold TODO examples inside fenced code in both outputs;
  unfinished prompts in prose and frontmatter still block publication.
- Suggest native relationships during project discovery and validation when
  related-reading sections contain document links. Hints are nonblocking and
  never create relationships automatically. The component index maps tasks to
  native features.

- Hide or rename the sidebar’s “Explore” heading with
  `outputs.html.navigation.heading`; `false` hides it while retaining the filter label.

- Remove the page-sized focus rectangle after clicking article content. Keyboard
  jumps still focus the article and indicate the destination at its title.

**Upgrade:** Rebuild exports and update custom consumers from `manifest.documents`
to `manifest.resources` with typed `ref` objects. Existing `documents` selectors
remain page-selection shorthand. Read paths from the new manifest; do not retain
old payload paths. Whole-page consumers can use the updated help-drawer example;
the content-delivery example demonstrates both transports and repeated mounts.

## 0.1.0-alpha.12 — 2026-10-27

- Refresh the bundled documentation from the reviewed public site: organize navigation into Docs, Reference, Examples, and Project; use installed-package commands in customer workflows; and standardize component reference sections.
- Explain HTML, Markdown, and agent behavior across feature references, and remove customer-facing embedding instructions for the site’s theme demo.

Upgrade to alpha.12 to use the refreshed offline documentation through the CLI and MCP tools. Runtime behavior, components, and configuration are unchanged from alpha.11.

## 0.1.0-alpha.11 — 2026-10-27

- Move package distribution to the public npm registry. New installations need no GitHub package access or token. Existing users should remove the old `@shoalrun` registry override and update their manifest and lockfile together; see the README.
- Lead the quickstart with the showcase and explain how to replace the fictional API without leaving broken Cedar operation bindings.
- Add package homepage, repository, and issue links, and document the maintainer-led contribution policy and alpha expectations.

This release changes distribution and onboarding. Existing site configuration and output contracts remain compatible with alpha.10.

## 0.1.0-alpha.10 — 2026-10-27

- Let mobile header tools share a row when space permits; anchor search results within the available header width.
- Raise small reader, code, and API control labels and navigation metadata; keep ordinary list prose within the same reading measure as paragraphs.
- Include page type and full-page token count in compact discovery and navigation indexes while preserving the 2,000-token index budget.
- Add `shoalrun init --starter showcase`: an editable Cedar Parcel handbook with component examples, diagrams, reader views, a landing page, local-workflow cookbook, and generated API references.

## 0.1.0-alpha.9 — 2026-10-27

- Documentation pages put the article before the full navigation in HTML, so
  readers and agents reach the page content sooner. Desktop sidebars stay on the
  left. On smaller screens, the article is followed by the outline/API examples
  and documentation navigation.
- Desktop keyboard skip links appear on focus without adding a navigation row.
  On narrow screens, one Menu button opens section links and page navigation in
  a drawer; closing it restores focus and the article's scroll position.
- The mobile page outline sits below the introduction in an On this page
  disclosure. Navigation remains available through ordinary links and native
  disclosures without JavaScript.

## 0.1.0-alpha.7 and 0.1.0-alpha.8 — 2026-10-26

These releases keep exported images and links with the correct document and let
AI assistants find documentation through smaller topic directories. Upgrade to
alpha.8 and rebuild to receive both sets of changes.

### Topic discovery (alpha.8)

- Compact discovery now splits growing catalogs into topic indexes with a
  2,000-token limit per index. Topics use publication and primary taxonomy area,
  falling back to page type. Large topics and navigation indexes split again
  automatically; all published pages and standalone-section links remain reachable.
- `llms.txt` remains the complete catalog. Consumers of `llms.min.txt` must follow
  topic-index links when present instead of expecting every page in the first read.

### Export and package hardening (alpha.7)

The export manifest remains at schema version 1.

- Pages sharing a website route retain their own local images and document links
  in exported HTML and Markdown. This includes cards, related reading, cookbook
  choices, deprecation notices, and changelog notices.
- The manifest schema rejects traversal segments, empty path segments, and unsafe
  export mount paths.
- Output commits reject unsafe artifact paths and duplicate route aliases before
  writing. Symlinked output destinations are refused, and aliases of a parent
  directory share the same output lock.
- The help-drawer example moves keyboard focus into opened content, follows scoped
  anchors, and restores focus to its launcher when closed with Escape.
- MCP server and client dependencies move to 2.3.0, Zod to 4.6.6, and KaTeX to
  0.18.2. MCP tool arguments are limited to 1,024 elements before schema validation;
  HTTP requests retain the 64 KiB body limit and per-request server instances.
- Development dependencies receive compatible advisory fixes. Full test runs cap
  concurrency at four files, rebuild tests use complete server events, and skill
  validation checks Python prerequisites once with setup instructions.
- Package smoke checks enforce an explicit inventory and can exercise the
  installed help-drawer example in a browser with `--clean-install --browser`.

### Compatibility

Choose a real output directory rather than a symlink as the build or export
destination. Parent-directory symlinks remain supported. This is still an alpha;
the existing configuration and output compatibility policy applies.

### Security references

The dependency updates address the advisories for
[MCP connection isolation](https://github.com/advisories/GHSA-jm63-cq47-j5jp),
[MCP input validation](https://github.com/advisories/GHSA-46jr-4wx8-v453),
[MCP bearer-token audience checks](https://github.com/advisories/GHSA-rvq5-wwqv-78pq),
[Zod collection validation](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), and
[KaTeX inherited settings](https://github.com/advisories/GHSA-238p-pmpm-9mq7).
