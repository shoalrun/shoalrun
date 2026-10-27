# Changelog

## Unreleased

- Documentation pages put the article before the full navigation in HTML, so
  readers and agents reach the page content sooner. Desktop sidebars stay on the
  left. On smaller screens, the article is followed by the outline/API examples
  and documentation navigation.
- Top-of-page links open and focus navigation or the page outline, with links
  back to the article. Keyboard focus stays visible across viewport changes;
  native links and disclosures remain usable without JavaScript.

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
