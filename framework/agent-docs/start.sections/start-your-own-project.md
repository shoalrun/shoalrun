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

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/start.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Create a page](https://www.shoalrun.com/author/add-page.md) — Create another page and add it to navigation.

This quickstart takes you from installing Shoalrun to your own working documentation site. You will scaffold a page from a template, complete its draft, put it in the sidebar, and read its HTML and Markdown output.

> **Private alpha:** Your GitHub account needs access to the private `@shoalrun/cli` package. You do not need access to the framework source repository.

## Start your own project

Install an exact version of the private alpha and initialize the minimal starter:

```sh
mkdir my-docs
cd my-docs
npm init -y
npm install --save-exact @shoalrun/cli@0.1.0-alpha.10 --@shoalrun:registry=https://npm.pkg.github.com
npx --no-install shoalrun init .
```

[Diagrams](https://www.shoalrun.com/author/components/diagrams.md) build without Chrome. The starter puts `docs.config.yaml` and `content/` in your project. Initialization refuses to overwrite starter files, and preserves unrelated files such as the package manifest and lockfile.

Preview the starter:

```sh
npx --no-install shoalrun dev docs.config.yaml site-dist --port 8765
```

Open `http://127.0.0.1:8765/`. You should see the Acme handbook example with a welcome page and an installation page. Press **Ctrl+C** to stop the preview before continuing.
