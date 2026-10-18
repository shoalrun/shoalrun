---
id: guide.overview
title: Getting started
summary: Create a documentation site, scaffold your first page from a template,
  and preview its HTML and Markdown.
type: tutorial
canonical: /start
---

# Getting started

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Getting started

**Updated: 2026-10-18.**

Parent page: [Full Markdown page](/start.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Create a page](https://www.shoalrun.com/author/add-page.md) — Create another page and add it to navigation.

This quickstart takes you from installing Shoalrun to your own working documentation site. You will scaffold a page from a template, complete its draft, put it in the sidebar, and read its HTML and Markdown output.

> **Private alpha:** Your GitHub account needs access to the private `@shoalrun/cli` package. You do not need access to the framework source repository.

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
