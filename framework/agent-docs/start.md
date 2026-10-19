---
id: guide.overview
title: Getting started
summary: Create a documentation site, scaffold your first page from a template,
  and preview its HTML and Markdown.
type: tutorial
area: project
subarea: project-overview
canonical: /start
---

# Getting started

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Getting started

**Updated: 2026-10-19.**

This quickstart takes you from installing Shoalrun to your own working documentation site. You will scaffold a page from a template, complete its draft, put it in the sidebar, and read its HTML and Markdown output.

> **Private alpha:** Your GitHub account needs access to the private `@shoalrun/cli` package. You do not need access to the framework source repository.

## Prerequisites

Install Node.js 22.12 or newer and npm. Use the npm that comes with Node.js; Shoalrun sets no separate npm version. The commands below use a POSIX shell, such as Bash or Zsh.

Authenticate to GitHub Packages with a classic personal access token that has `read:packages`. Enter it at the password prompt; keep it out of files you commit:

```sh
npm login --scope=@shoalrun --registry=https://npm.pkg.github.com --auth-type=legacy
```

Your account also needs permission to read the package. A token scope alone does not grant package access.

## Start your own project

Install an exact version of the private alpha and initialize the minimal starter:

```sh
mkdir my-docs
cd my-docs
npm init -y
npm install --save-exact @shoalrun/cli@0.1.0-alpha.2 --@shoalrun:registry=https://npm.pkg.github.com
npx --no-install shoalrun init .
```

[Diagrams](https://www.shoalrun.com/author/components/diagrams.md) build without Chrome. The starter puts `docs.config.yaml` and `content/` in your project. Initialization refuses to overwrite starter files, and preserves unrelated files such as the package manifest and lockfile.

Preview the starter:

```sh
npx --no-install shoalrun dev docs.config.yaml site-dist --port 8765
```

Open `http://127.0.0.1:8765/`. You should see the Acme handbook example with a welcome page and an installation page. Press **Ctrl+C** to stop the preview before continuing.

## Create a page

Start new pages from a template. From the same `my-docs/` directory, scaffold the built-in how-to template:

```sh
npx --no-install shoalrun scaffold how-to -n content/first-page.mdx \
  --id guide.first-page --title 'Your first page'
```

The command creates draft frontmatter and a body with prompts for outcomes, steps, checks, and recovery. It derives the slug `/first-page` and refuses to overwrite existing files. Use a registered project template when your team has one; [create a page](https://www.shoalrun.com/author/add-page.md) explains the choices.

Open `content/first-page.mdx`. Set `updated` to today's date in `YYYY-MM-DD` format. Replace its generated summary with `Find the installation guide and check its Markdown page.` Keep `access.policy` set to `draft` while completing the prompts.

For this small walkthrough, replace the template body below the closing frontmatter delimiter with this completed example. It keeps the introduction, actions, and verification together:

```md title="Completed template body"
Find this handbook's installation instructions and their Markdown copy.
This page is for readers exploring the example documentation site.

## Before you begin

Run the local documentation preview and open its home page.
No account or credentials are needed.

## Complete the task

1. Open Setup in the sidebar.
2. Choose Install Acme to open the [installation guide](doc:guide.install).
3. Read the example version command. Acme is fictional; do not run it.

## Check the result

The installation page shows an example command: `acme --version`.
Open `/install.md` on the same local server and find that command there too.

## Handle common failures

If the page does not load, restart the preview and check its printed address.
If the installation page is missing, restore the minimal starter's install file.

## How it works for agents

The Markdown page contains the same instructions and version command.
Its installation link points to `/install.md`.

## Next steps

Read the [installation guide](doc:guide.install) in either format.

## Editorial evidence

The minimal starter's `content/install.mdx` supplies the page and example command.
```

Review the content and replace every remaining template prompt before setting `access: { policy: public }` in the header. The build rejects unfinished public drafts, including the generated draft summary.

`id` is the stable target used by navigation and `doc:` links. `slug` sets the page URL. Keep the generated publication fields; the minimal starter enables their combination.

## Add the page to navigation

In `docs.config.yaml`, replace the existing `navigation` block with this block. Keep the rest of the file:

```yaml title="docs.config.yaml"
navigation:
  - id: welcome
    doc: guide.welcome
  - id: setup
    label: Setup
    items:
      - id: install
        doc: guide.install
      - id: first-page
        doc: guide.first-page
```

Creating a page does not add it to navigation automatically. This entry puts **Your first page** under **Setup**, using its frontmatter title as the label.

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

## Make it yours

Change `site.title` in `docs.config.yaml`, replace the Acme example content, and keep adding pages with the [add a page guide](https://www.shoalrun.com/author/add-page.md). The [configuration guide](https://www.shoalrun.com/configuration.md) explains how to compose project settings. The [page metadata guide](https://www.shoalrun.com/author/frontmatter.md) explains drafts and shared defaults. For help from an agent, see [use the bundled agent skills](https://www.shoalrun.com/contribute/agent-skills.md).

Continue by [adding an OpenAPI API](https://www.shoalrun.com/publish/api-references.md), or [publish your site](https://www.shoalrun.com/publish.md).

## Build this site

Shoalrun's documentation repository installs the package too. From that repository's root, run `npm ci` and `npm run docs:dev`. It serves these docs at `http://127.0.0.1:8770/`.

## Check writing style

For checks on your own built site, see [audit documentation](https://www.shoalrun.com/publish/audit.md).

## Related reading

### Next steps

- [Create a page](https://www.shoalrun.com/author/add-page.md) — Create another page and add it to navigation.

### Reference while working

- [CLI reference](https://www.shoalrun.com/cli.md) — Look up each command's arguments, defaults, and failure cases.

- [Example configs](https://www.shoalrun.com/config/examples.md) — Start from a complete config for a common kind of site.

- [Glossary](https://www.shoalrun.com/glossary.md) — Look up a term a guide uses before you know it.

### Related topics

- [Use the bundled agent skills](https://www.shoalrun.com/contribute/agent-skills.md) — Give an agent the same setup and authoring workflow as a bundled skill.

- [How Shoalrun works](https://www.shoalrun.com/concepts.md) — Learn the build pipeline and the terms the rest of these docs use.
