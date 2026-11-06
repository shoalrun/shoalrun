# Changelog

## 0.1.0-beta.1 — 2026-11-05

- Add custom code-fence highlighting with local TextMate JSON grammars and aliases.
- Export [styled page or publication PDFs](https://www.shoalrun.com/publish/pdf) with custom fonts, covers, contents,
  and page layouts. CLI and optional Node downloads require Chrome or Chromium.
- Add configurable branded Print PDF buttons for static sites using the
  reader's browser.
- Add the `shoalrun-pdf` agent skill, runnable examples, and configuration guides.
- Harden private runtime paths and print asset loading.

Upgrade to CLI `0.1.0-beta.1` and rebuild. Page printing is off by default;
manual downloads require an explicit export and deployment.

## 0.1.0-alpha.19 — 2026-11-05

- Give your coding agent the `shoalrun-brand` skill to match a documentation
  site to your brand. It guides the agent through choosing colors and fonts,
  adding your logo, and applying theme settings and CSS. It also checks search
  results, menus, buttons, keyboard focus, and mobile layouts for readability.
  Read it with `shoalrun skills read shoalrun-brand`.
- Make hosted chat verify where a visitor check came from. Turnstile responses
  must match a trusted hostname and, when configured, the expected action.
  A session pass from a different hostname/action policy no longer skips the
  check, even when the deployments share a secret. Changing the policy
  invalidates existing passes. Upgrade the CLI, then rebuild and
  redeploy hosted chat to apply these protections.
- Keep local and hosted test previews working with Turnstile's published test
  keys. Local preview checks the actual dummy-token response; the documentation
  site's hosted preview requires test credentials and a separate usage store.
- Check development dependencies as well as production dependencies in both
  repositories during a coordinated release. Update the documentation site's
  browser tools and affected dependencies to remove the identified security
  advisories without forcing incompatible package versions.
- Add security headers to the documentation site that restrict framing to the
  same origin and set an explicit referrer policy. Deployment checks now reject
  responses missing the required headers. A broader Content Security Policy
  starts in report-only mode so browser violations can be reviewed before
  enforcement; it doesn't yet block scripts. These are site-owned settings,
  not new defaults imposed on customer sites.
- Refresh the repository and package READMEs with product versions, customer
  editions, branding, application content delivery, and agent workflows. Update
  the hosted-chat guide with hostname checks, optional actions, session passes,
  and preview configuration.

## 0.1.0-alpha.18 — 2026-11-04

- Add authored page availability ranges with `since` and `through` version
  labels. Reuse the release-version text style beside page dates, retain labels
  in Markdown and metadata in the document manifest, and keep availability
  separate from publication selection.

- Add product publication catalogs with independent versions and default
  versions. Product-aware publications preserve their identity through routes,
  links, navigation, APIs, search, and content exports. Existing productless
  publication identities and routes remain compatible.
- Select product releases independently in customer deployment profiles,
  alongside existing SKU revisions and feature grants. Continue to apply
  `requires` and `<ForFeature>` during compilation across emitted content.
- Accept `dev --profile FILE` to build, serve, and watch a customer edition in
  one command. Watch external profile inputs, replace output after successful
  rebuilds, and disclose failed rebuilds while serving the last successful
  edition. Reload removed pages at the new edition's landing page.

- Add bounded, paginated MCP `get_publications` discovery and retain product
  coordinates in search read arguments. Emit v2 product content contracts while
  preserving legacy v1 exports.

## 0.1.0-alpha.17 — 2026-11-04

- Package hosted Ask and Search without importing source configuration or its
  component compiler, icon, syntax-highlighting, math-rendering, and esbuild
  dependencies. Hosted functions consume resolved settings; local commands
  retain source-config loading.
- Build Search from its own dependency closure and private retrieval files,
  without chat generation, answer cards, or third-party runtime packages.
  Preserve existing hosted metadata and deep imports for compatibility.
- Keep prepared search scoring and snippets separate from Markdown preparation,
  and retain runtime and dependency licenses in function packages.
- Test isolated function imports and requests, enforce per-runtime file/byte
  budgets, and reject build-only dependencies in hosted runtime packages.

No configuration migration is required. Upgrade the CLI and rebuild the hosted
bundle to apply the smaller function packages; existing deployments are unchanged.

## 0.1.0-alpha.16 — 2026-11-04

- Set `outputs.html.search.provider: semantic` to connect the search box to
  Shoalrun's semantic endpoint without writing a custom browser module. The
  included keyword index remains available when the endpoint is absent or
  unavailable. Configure an embedding provider, build the passage index, and
  run or deploy the search endpoint; selecting the browser provider alone does
  not provision a backend.

- Qualify stored passage IDs by publication so repeated page and section IDs
  across releases cannot alias embedding rows or citation digests. Rebuild
  passage indexes with `shoalrun index`; when using semantic retrieval, rerun
  indexing with `--embed` and the same embedding configuration to reuse cached
  inputs. Regenerate answer cards after rebuilding their cited passage IDs.
  Ambiguous legacy indexes now fail with rebuild instructions.
- Include publication membership, routes, reader marks, and prepared search
  evidence in passage-index generation hashes without changing embedding inputs.
- Read publication-specific passage counts and `sourceDigest` from the index
  command's JSON summary to check which retained releases were indexed.
- Stream hosted search scores into page selection, retaining at most three
  candidates per page and a result-sized final ranking. Large galleries no
  longer require an unbounded sorted passage array. Exact identifiers reserve
  a slot among displayable pages and keep literal table/code landing evidence.
  File-backed retrieval still scans the selected publication; external vector
  storage and publication-sharded browser downloads are not included yet.

## 0.1.0-alpha.15 — 2026-11-03

- Opt into `profiles.requireClassification` to reject unclassified public pages
  before customer selection. Declare `shared: true` or page feature requirements;
  shared pages can retain feature-gated sections. Generated API references accept
  explicit API or OpenAPI operation declarations.
- Packaged authoring, setup, and recipe skills explain customer-edition workflows,
  including external profiles, SKU revisions, grandfathered grants, strict page
  classification, conditional sections, and checks for excluded content.

- Build customer-specific documentation from an external deployment profile.
  Resolve versioned SKU mappings and direct feature grants, including
  grandfathered features without a SKU; select pages and conditional sections
  consistently in websites and content exports.
- Supply deployment-owned titles, logos, favicons, theme choices, links, and
  publication subsets without storing customer profiles in the shared repo.
  Capture declared external inputs for validation and preview, and keep profile
  sources out of published dependency metadata.
- Profiled API builds support selected references and focused operation contracts;
  full-source downloads and standalone schema embeds are rejected.

See [deployment profiles](DEPLOYMENT-PROFILES.md) for configuration and current limits.

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
