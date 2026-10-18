---
id: guide.release-revisions
title: Use Git branches for separate docs sites
summary: Build a chosen Git branch for each docs address, add links between
  sites, and verify the deployed commit.
type: how-to
canonical: /publish/revisions
---

# Use Git branches for separate docs sites

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Use Git branches for separate docs sites

**Updated: 2026-09-30.**

A deployment takes the docs files from a Git branch or commit, builds them, and serves the result at an address you choose. Your host or CI service chooses the source and destination. Branch names have no special meaning to Shoalrun.

For example, either of these mappings can work:

| Workflow               | Source    | Docs address               |
| ---------------------- | --------- | -------------------------- |
| Sandbox and production | `sandbox` | `sandbox-docs.example.com` |
| Sandbox and production | `main`    | `docs.example.com`         |
| Next and stable        | `next`    | `next-docs.example.com`    |
| Next and stable        | `stable`  | `docs.example.com`         |

You can use another branch name, a tag, or a fixed commit. You can also use [path-based versions within one build](https://www.shoalrun.com/publish/publications.md) instead of separate sites. Branches choose *which files to build*; publications choose *which editions those files produce*.

## Build and deploy each source

Set `site.origin` in each site's config to its public HTTPS origin. A site at `next-docs.example.com`, for example, uses `site.origin: https://next-docs.example.com`. Commit the pages, API sources, and publication settings for that site.

After the deployment job checks out its chosen source, build it with the full commit hash:

```sh
shoalrun build docs.config.yaml site-dist --source-commit "$(git rev-parse HEAD)"
```

Deploy all of `site-dist/` to the address assigned to that source. Configure this source-to-address rule in your host or CI service; Shoalrun does not deploy files or infer a branch from `channel`. See [deploy your documentation](https://www.shoalrun.com/publish.md) for hosting options. If two separate domains should both serve `/start`, use an empty channel `pathPrefix` in each site's config.

## Add another site to the Version menu

Add an external site when readers should be able to move between addresses. In the current site's `publications` section, keep its existing `defaults`, `channels`, `versions`, and `enabled` entries, and add:

```yaml title="docs.config.yaml (fragment)"
publications:
  externalSites:
    - label: Next docs
      baseUrl: https://next-docs.example.com
```

This adds **Next docs** to the Version menu on every page. The link opens that site's root. Add the corresponding link in the other site's config if readers should be able to switch back. `baseUrl` can be another domain or an address with a path, such as `https://docs.example.com/next/`.

To keep a reader on the *matching page*, provide a local snapshot of the other site's built `documents.json`:

```yaml title="docs.config.yaml (fragment)"
publications:
  externalSites:
    - label: Next docs
      baseUrl: https://next-docs.example.com
      manifest: ./config/next-documents.json
```

Shoalrun matches stable document IDs and uses the other site's published paths. Only pages in that manifest appear in the menu. Copy or refresh the manifest as part of your release process when pages change. This extra step is optional; the direct site link above is enough for a simple branch switcher.

A `baseUrl` with a path changes where the menu points. Hosting a *whole standalone build* under a path also requires the host to handle Shoalrun's root-level assets and discovery files. [Path prefixes inside one build](https://www.shoalrun.com/publish/publications.md) already work without that hosting setup.

## What agents receive

Each deployed site has its own Markdown pages, `documents.json`, search index, and agent discovery files, built from that site's selected Git revision. An agent using the stable site reads its stable artifacts; an agent using the next site reads its next artifacts. The external Version menu helps human readers navigate between sites, but it does not combine their manifests or Markdown copies. Preserve a built release or its tagged source if agents must be able to consult it later. See [published outputs](https://www.shoalrun.com/publish/output.md) for the file list.

## Check the deployed source

Each build writes its source commit to `/build-info.json`. Run the [post-deploy checker](https://www.shoalrun.com/publish/deployment-check.md) with the full hash selected by that site's deployment job:

```sh
npm --prefix framework run deploy:check -- https://next-docs.example.com/ --source-commit "$DEPLOYED_COMMIT"
```

The checker fails if the address serves a different commit or if its published HTML and Markdown routes fail their HTTP checks. Run it for each site. For a durable release record, tag the source commit and retain the built output with `/build-info.json`; a branch moves as new commits arrive.

## Related reading

### Read first

- [How Shoalrun works](https://www.shoalrun.com/concepts.md) — Understand publications, channels, and versions.

### Next steps

- [Check a deployed site](https://www.shoalrun.com/publish/deployment-check.md) — Check each deployed revision before you release it.

### Related topics

- [Share pages across documentation versions](https://www.shoalrun.com/publish/publications.md) — Distinguish content editions from source revisions and retained builds.

### Often confused with

- [Write release notes and changelog entries](https://www.shoalrun.com/author/release-notes.md) — Release notes tell readers what changed; release revisions choose which Git revision of the docs to build and deploy.
