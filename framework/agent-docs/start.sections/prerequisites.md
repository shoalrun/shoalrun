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

## Prerequisites

Install Node.js 22.12 or newer and npm. Use the npm that comes with Node.js; Shoalrun sets no separate npm version. The commands below use a POSIX shell, such as Bash or Zsh.

Authenticate to GitHub Packages with a classic personal access token that has `read:packages`. Enter it at the password prompt; keep it out of files you commit:

```sh
npm login --scope=@shoalrun --registry=https://npm.pkg.github.com --auth-type=legacy
```

Your account also needs permission to read the package. A token scope alone does not grant package access.
