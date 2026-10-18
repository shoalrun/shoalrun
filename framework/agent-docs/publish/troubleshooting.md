---
id: guide.troubleshooting
title: Troubleshooting
summary: Troubleshoot a build, recover missing pages and fix document links,
  route collisions, MDX errors, API review digests, and diagram rendering.
type: how-to
canonical: /publish/troubleshooting
---

# Troubleshooting

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Troubleshooting

**Updated: 2026-10-17.**

Run these commands from your documentation project, with `SHOALRUN_CLI` pointing to the compiled CLI as in the [quickstart](https://www.shoalrun.com/start.md). Start by rebuilding so the error names the current source file:

```sh
node "$SHOALRUN_CLI" config validate docs.config.yaml
node "$SHOALRUN_CLI" build docs.config.yaml dist
```

Config validation checks configuration; a full build also resolves content, links, routes, and API reviews. The messages below are compiler message fragments; file paths and document IDs vary by project.

## A page is missing

Drafts and pages outside enabled publications can be excluded without a build error. Inspect both the effective config and the built page list:

```sh
node "$SHOALRUN_CLI" config resolve docs.config.yaml
node -e 'const m = require("./dist/documents.json"); console.log(JSON.stringify(m.documents, null, 2))'
```

Check the page's resolved `access.policy` is `public` and its channel, version, and language match an entry in `publications.enabled`. `frontmatter.enforced` overrides page values; a draft enforced there keeps even an explicitly public page out of the build. See [versions and languages](https://www.shoalrun.com/publish/publications.md).

If the manifest contains the page but the menu does not, add its exact document ID to `navigation` (or the YAML file included there):

```yaml
navigation:
  - id: my-page
    doc: guide.my-page
```

Append that entry to the existing list. Scaffolding a file does not add it to navigation. A navigation reference to an unavailable page is omitted for that publication.

If publishing instead fails with `unresolved scaffold placeholders cannot be published`, finish every scaffold TODO and replace the draft summary before setting `access: { policy: public }`.

## An internal link fails

`unknown document link doc:guide.install` means the target is unavailable in the linking page's publication. Check spelling against the target's `id`, its public access, and its publication fields. A source file in another version or language does not satisfy the link. Add the corresponding variant or link to an available page.

Use `doc:` plus a document ID for internal links, for example `[Install](doc:guide.install)`. File paths are not document IDs. Rebuild after correcting the source and target.

## Two pages claim one identity or route

`Duplicate document identity` means two files have the same ID and publication combination. Keep one file per variant, or assign a distinct ID to a different page.

`Route collision /install` means different pages produce the same final URL. Check their slugs together with language, channel, and version prefixes. `Output artifact collision` can also mean a page conflicts with a generated resource or another output file. Resolve the source configuration; changing the output directory does not fix conflicting URLs. [Versions and languages](https://www.shoalrun.com/publish/publications.md) shows how prefixes distinguish editions.

## MDX cannot compile

`dynamic MDX expression has no semantic adapter` means the page contains JavaScript expressions that Shoalrun cannot project into its published formats. Replace executable MDX with Markdown or one of the [supported components](https://www.shoalrun.com/author/components.md). Put code intended for readers inside a fenced code block so it remains literal text.

Component validation errors name the source file and component. Check the component's documented attributes and nesting. Ordinary MDX syntax errors can also come from unescaped braces or angle brackets in prose; use inline code for literal syntax.

## An API review digest is missing or stale

`apis.payments.publicReview.digest is missing` or `apis.payments.publicReview.digest is stale` means the published API content needs review. Generate a local candidate:

```sh
API_REVIEW_DIR="$(mktemp -d)"
node "$SHOALRUN_CLI" api review docs.config.yaml --output "$API_REVIEW_DIR"
```

Inspect the candidate pages, contracts, source downloads, and input hashes. Copy the reported digest into that API's `publicReview.digest`, then run the normal build again. Source changes, selections, embeds, and source-publication choices can change the digest. Do not copy a digest from another project or bypass the review by publishing the candidate output. See [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md).

## A diagram fails to render

`failed to render mermaid diagram "Review flow"` (or `d2`) includes the source file and the renderer's underlying error. If it names diagram syntax, fix the code fence and rebuild. Errors such as `<Diagram> needs exactly one nonempty mermaid code fence` concern component structure; follow the [diagram reference](https://www.shoalrun.com/author/components/diagrams.md).

Mermaid syntax renders with Pele; it does not need Chrome or Mermaid CLI. Check [Pele’s compatibility guide](https://pele.run/compatibility) if source from another Mermaid renderer fails. D2 uses the installed `@d2lang/d2` runtime. Reinstall framework dependencies if either renderer is missing. Include the source file, diagram title, and complete underlying error when reporting a failure.

## Local output works but the deployed site fails

A successful local build does not check the host's routing or headers. Use [Check a deployed site](https://www.shoalrun.com/publish/deployment-check.md) for wrong Markdown content types, missing negotiation, discovery resources, or 404 responses. The [publishing guide](https://www.shoalrun.com/publish.md) links the supported hosting workflows.

## Related reading

### Reference while working

- [CLI reference](https://www.shoalrun.com/cli.md) — Look up diagnostic commands and failure behavior.

### Related topics

- [Create a page](https://www.shoalrun.com/author/add-page.md) — Find why a page is missing or a build fails.
