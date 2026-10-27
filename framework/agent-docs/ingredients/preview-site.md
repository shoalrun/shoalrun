---
id: ingredient.preview-site
title: Serve the built docs locally
summary: Open a successful build over HTTP and compare a page with its Markdown twin.
type: ingredient
area: publishing
subarea: publishing-builds
canonical: /ingredients/preview-site
---

# Serve the built docs locally

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Examples](https://www.shoalrun.com/.well-known/shoalrun/navigation/examples-tab-50f26fe22670.txt) (ID: examples-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Examples](https://www.shoalrun.com/config/examples.md) > Maintain this documentation site > Reusable Shoalrun steps > Serve the built docs locally

**Updated: 2026-10-19.**

Serve the build from the repository root:

```sh
npx --no-install shoalrun serve docs/dist --port 8770
```

This command occupies the terminal. Open `http://127.0.0.1:8770/author/recipes/` and `http://127.0.0.1:8770/author/recipes.md` in a browser. For another page, use its `url` and `markdownUrl` from `docs/dist/documents.json`.

Check the page title, navigation, links, images, code copying, and complete instructions in Markdown. Check the page at a narrow window width too. If port 8770 is occupied, select another port and use it in both URLs.

Press **Ctrl+C** when finished. This server serves the existing build; rebuild and reload after editing. Use `npm run docs:dev` for ongoing work that should rebuild automatically.
