---
id: guide.manni
title: Use Manni with Shoalrun
summary: Use Manni in your documentation project.
type: how-to
area: publishing
subarea: publishing-builds
canonical: /publish/manni
---

# Use Manni with Shoalrun

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Use Manni with Shoalrun

**Updated: 2026-10-25.**

Parent page: [Full Markdown page](/publish/manni.md)

[Manni](https://hawkeyexl.github.io/manni/) is a toolkit for managing and checking documentation. It can validate, query, and help fill page information; manage terminology; track connections between explanations and source code; and build knowledge graphs. It also provides tools for testing documentation and running evaluations.

This guide focuses on its checking tools. You choose the rules, and Manni reports pages that break them. For example:

- A page is missing its title or description.
- A tutorial gives instructions but never tells readers how to check that they worked.
- A page refers to a glossary term that no longer exists.
- Code has changed underneath an explanation, so the explanation needs another look.

Shoalrun builds and delivers your docs. Here, we use Manni to add checks before publishing, while its other tools remain available through the same command. You can use either tool without the other.

This guide shows how to run Manni in a Shoalrun project and add a check to `shoalrun audit`. That command runs the checks you configure and reports whether they passed. Start with one useful rule, then add more when you need them. For a working example, see [how we use Manni on this site](https://www.shoalrun.com/publish/manni.md#how-this-site-uses-manni).

Manni's [documentation site](https://hawkeyexl.github.io/manni/) describes its available tools and rules. Your choices go in `manni.config.yaml`; you do not need a separate Shoalrun setting for each Manni feature.

## How this site uses Manni

Here are some ways we use Manni to check the docs you are reading. You can adopt the examples that suit your project.

**Catch broken glossary references.** Some pages list the glossary terms they discuss, such as “facet” or “reader view.” If an author types “reader veiw” in that list, the check fails because no such term exists. We check those lists against the [glossary](https://www.shoalrun.com/glossary.md), using its existing definitions. This does not check every word in the prose.

**Keep instructions complete.** On this page and the [content export guide](https://www.shoalrun.com/publish/content-export.md), we require prerequisites, named steps with instructions, and a final result check. The [getting-started tutorial](https://www.shoalrun.com/start.md) must cover setup, creating a page, navigation, and checking both outputs. Two common problems in [troubleshooting](https://www.shoalrun.com/publish/troubleshooting.md) must explain their cause and what to do. Removing one of those required sections makes the check fail.

**Try the quickstart commands.** A procedure test creates a disposable project and follows the quickstart's initialization, scaffolding, and build instructions. It uses the completed page and navigation examples from the guide, then checks the promised HTML, Markdown, and links. Manni runs this test through [Doc Detective](https://doc-detective.com/). Registry login, package downloading, and the long-running preview server remain manual steps.

**Check every published HTML page.** Manni opens each page in a browser and checks for problems such as unnamed buttons, missing image descriptions, and insufficient contrast. We use the build's page list, so pages outside navigation are checked too. This scan covers browser pages; Markdown and API downloads are separate resources.

**Find explanations that need another review.** Our metadata guide explains which settings win when a page and its project configuration provide different values. We connect that paragraph to the code that implements the behavior. Manni records both texts and flags a change to either one. A person then reviews whether the explanation still matches the code.

The glossary, structure, and quickstart procedure checks run when we audit our documentation. The accessibility scan runs against an existing build. The code citation check runs separately because it needs a copy of the framework source code. None of these checks are required for your own Shoalrun project.

### Run these checks in this documentation repository

These scripts belong to this site's documentation project:

```sh
npm run docs:terms
npm run docs:structure
npm run docs:procedures
```

The glossary script reads four definitions from the existing glossary and gives them to Manni. Pages identify their glossary references with `concepts` in their YAML headers. The structure check uses a Manni template that understands Shoalrun's `Steps` and `Step` components.

The procedure check uses the project's installed CLI and pinned Doc Detective dependency. It extracts selected commands and completed examples from the quickstart, runs them in a temporary directory, and removes the directory afterward. Doc Detective's automatic updates and telemetry are disabled for this check.

For accessibility, build once and scan that output:

```sh
npm run docs:build
npm run docs:a11y
```

The scan starts a temporary local server and checks every HTML page named in `documents.json`, including pages without navigation links. It fails on detected violations, skipped pages, or incomplete coverage. It reuses the built files and does not run another build. You can select another built directory with `SHOALRUN_BUILT_SITE`.

To check the connection between our metadata guide and its implementation, provide a framework source checkout. Replace `/path/to/shoalrun` with its location:

```sh
npm run docs:citations -- --repo framework=/path/to/shoalrun
```

The citation record is kept outside the published page. Review changes to the explanation and code before updating that record. It identifies the source version reviewed; it does not replace testing the installed Shoalrun package.
