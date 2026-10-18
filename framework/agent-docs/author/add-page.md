---
id: guide.add-page
title: Create a page
summary: Create a page from a template, complete its scaffolded draft, and
  publish it in navigation.
type: how-to
canonical: /author/add-page
---

# Create a page

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Create a page

**Updated: 2026-10-17.**

Create a page from a template with `scaffold`. Templates prompt you for the page's frontmatter, an introduction, the main content, and related pages before you publish. This is the recommended authoring workflow for new pages.

This guide assumes you have completed [getting started](https://www.shoalrun.com/start.md) and are working in `my-docs/`. Keep `SHOALRUN_CLI` pointing to the checkout's `framework/dist/cli.js`.

## Choose a template

Choose the template that matches what the reader needs to accomplish.

| Template        | Use it for                                                                            |
| --------------- | ------------------------------------------------------------------------------------- |
| `tutorial`      | A reliable guided exercise for learning by doing.                                     |
| `how-to`        | A specific task, with practical actions and a success check.                          |
| `reference`     | Exact syntax, fields, options, examples, errors, and limits.                          |
| `explanation`   | Concepts, context, reasons, and tradeoffs.                                            |
| `api-reference` | Editorial context above generated operation details; requires one known operation ID. |
| `recipe`        | A complete task used by recipe and cookbook workflows.                                |
| `ingredient`    | One reusable action or check used in recipes.                                         |
| `cookbook`      | A page that helps readers choose complete recipes.                                    |

These templates ship with the CLI. `guide` and `troubleshooting` remain available for compatibility. Projects can register additional templates or override built-ins.

The CLI includes a [`recipe` template](https://www.shoalrun.com/author/recipe-drafts.md) for a complete customer task, written directly or assembled from ingredients. Built-in `ingredient` and `cookbook` templates support reusable steps and workflow selection. The `ingredient draft` command can start one ingredient from an API example; `recipe draft` assembles an ordered set of ingredient files for review.

Use the project's template for the document type when one exists. Project templates can also override the built-in names. See [templates](https://www.shoalrun.com/author/templates.md) to register or change one.

## Scaffold the draft

From the project directory:

```sh
node "$SHOALRUN_CLI" scaffold how-to -n content/track-parcel.mdx \
  --id how-to.track-parcel --title 'Track a parcel'
```

The command finds `docs.config.yaml`, creates the file, and adds the template body and draft frontmatter. It refuses to overwrite an existing file. This example sets the stable ID and title explicitly; the CLI derives the slug `/track-parcel` from the target path.

Without overrides, this path would produce ID `how-to.track-parcel` and title `Track Parcel`. The generated summary starts with `Draft guide for ` and must be replaced before publication. Publication fields come from your project configuration.

## Complete the template

Open `content/track-parcel.mdx` and work through its prompts:

1. Read the comments in the frontmatter, fill in the placeholder fields, and delete the comment lines.
2. Set `updated` to today's date in `YYYY-MM-DD` format. Write an introduction of 150 words or fewer and remove irrelevant optional sections.
3. Follow the chosen shape. Write a guided exercise, practical task actions, organized reference facts, or conceptual discussion. For this how-to, write actions and checks.
4. Keep the **HTML, Markdown, and agents** section when the page uses a component or behavior that changes either output or what an agent reads. Otherwise delete it.
5. Add relationships for the page, or delete Related reading. Verify technical claims before you publish.

Replace every TODO prompt enclosed in double square brackets. Adapt the sections to the task rather than leaving irrelevant prompts behind. Templates provide a starting structure; editing a template later does not rewrite this page. The [quickstart](https://www.shoalrun.com/start.md) shows a completed example.

Keep the generated `access.policy: draft` while writing. Drafts are validated but omitted from the published site, even if the starter defaults to public access. Headings in the body begin at level 2 because Shoalrun renders the page title separately.

## Publish the page

After reviewing the content, change the generated access value to:

```yaml
access: { policy: public }
```

Keep the ID `how-to.track-parcel` and slug `/track-parcel` for this example. Check the channel, version, and language match an enabled publication. The build rejects public pages with unresolved template prompts or the generated draft summary. See [page metadata](https://www.shoalrun.com/author/frontmatter.md) for shared defaults and publication rules. The [generated frontmatter reference](https://www.shoalrun.com/author/frontmatter-reference.md) lists native fields and this site's project declarations.

## Put it in navigation

Append this item to the existing `navigation` list in `docs.config.yaml`:

```yaml
  - id: track-parcel
    doc: how-to.track-parcel
```

Use the page's frontmatter ID for `doc`; the navigation item's own `id` identifies that menu entry. You can nest the item under a group's `items` list instead. Navigation uses the page title as its label unless you supply `label`.

A public page can have a working URL without appearing in the sidebar. Adding this entry makes it discoverable there. See [organize navigation](https://www.shoalrun.com/author/navigation.md) for groups, includes, and links.

## Verify HTML and Markdown

From the project directory:

```sh
node "$SHOALRUN_CLI" build docs.config.yaml site-dist
node "$SHOALRUN_CLI" serve site-dist --port 8765
```

Open `http://127.0.0.1:8765/track-parcel` and confirm that the page appears in navigation and that its links work. Then open `http://127.0.0.1:8765/track-parcel.md` and confirm that the same prose is available and internal links point to Markdown pages. Press **Ctrl+C** to stop the server.

If you use another publication or a language prefix, inspect the built `documents.json` for the resolved URLs. To preview edits continuously, use `node "$SHOALRUN_CLI" dev docs.config.yaml site-dist --port 8765`.

Next, [organize your navigation](https://www.shoalrun.com/author/navigation.md) as the site grows.

## Related reading

### Next steps

- [Templates](https://www.shoalrun.com/author/templates.md) — Adapt the starting template for your team's next pages.

### Reference while working

- [Page metadata](https://www.shoalrun.com/author/frontmatter.md) — Check the scaffolded page's publication and metadata fields.

### Related topics

- [Troubleshooting](https://www.shoalrun.com/publish/troubleshooting.md) — Find why a page is missing or a build fails.
