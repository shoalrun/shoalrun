---
id: guide.overview
title: Getting started
summary: Create a site, publish a page, and check both formats.
type: tutorial
area: project
subarea: project-overview
canonical: /start
---

# Getting started

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Getting started

**Updated: 2026-10-25.**

Parent page: [Full Markdown page](/start.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Create a page](https://www.shoalrun.com/author/add-page.md) — Create another page and add it to navigation.

This quickstart takes you from installing Shoalrun to your own working documentation site. You will scaffold a page from a template, complete its draft, put it in the sidebar, and read its HTML and Markdown output.

> **Private alpha:** Your GitHub account needs access to the private `@shoalrun/cli` package. You do not need access to the framework source repository.

## Build and check both outputs

Validate the configuration, build the site, and serve it:

```sh
npx --no-install shoalrun config validate docs.config.yaml
npx --no-install shoalrun build docs.config.yaml site-dist
npx --no-install shoalrun serve site-dist --port 8765
```

Check these URLs in your browser:

- `http://127.0.0.1:8765/first-page`: the HTML page, with **Your first page** in the sidebar.
- `http://127.0.0.1:8765/first-page.md`: the same content as Markdown.

The installation link should take you to `/install` in HTML and `/install.md` in the Markdown output. Commands print JSON and return a nonzero exit code on failure. If a page is missing, check its publication fields and navigation entry.

Press **Ctrl+C** to stop the server. For ongoing writing, run the `dev` command again; it rebuilds and refreshes the browser when you save edits. Builds replace the whole output directory, so keep `site-dist/` separate from your source files. Add `site-dist/` and `.shoalrun/` to your project's `.gitignore` if you do not want to track generated files.
