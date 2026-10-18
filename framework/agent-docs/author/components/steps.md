---
id: guide.component.steps
title: Steps
summary: Show a short procedure as numbered steps with full instructions in both
  outputs.
type: reference
canonical: /author/components/steps
---

# Steps

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Steps

**Updated: 2026-09-27.**

Use `<Steps>` when each part of a procedure needs a title and supporting content. For a simple sequence with no step titles, an ordinary Markdown numbered list is enough. For code that changes between steps, use a [Walkthrough](https://www.shoalrun.com/author/components/walkthroughs.md).

```mdx
<Steps>
<Step title="Create a page">
Add `content/first-page.mdx` with frontmatter and a short body.
</Step>
<Step title="Build the site">
Run `shoalrun build docs.config.yaml dist`, then open the output.
</Step>
</Steps>
```

1. ## Create a page

   Add `content/first-page.mdx` with frontmatter and a short body.

2. ## Build the site

   Run `shoalrun build docs.config.yaml dist`, then open the output.

## Choose a style

`rail` is the default: numbered circles and a connecting line keep a longer procedure easy to scan. Use `cards` to separate steps with substantial examples or decisions. Use `plain` for a quiet numbered list. The style changes HTML presentation; all three produce the same complete ordered list in Markdown.

```mdx
<Steps variant="cards">
<Step title="Prepare" icon="file-check-2">Check the draft page.</Step>
<Step title="Publish" icon="upload">Build and deploy the site.</Step>
</Steps>
```

1. ## Prepare

   Check the draft page.

2. ## Publish

   Build and deploy the site.

```mdx
<Steps variant="plain">
<Step title="Prepare">Check the draft page.</Step>
<Step title="Publish">Build and deploy the site.</Step>
</Steps>
```

1. ## Prepare

   Check the draft page.

2. ## Publish

   Build and deploy the site.

| Attribute      | Where   | Meaning                                                                                               |
| -------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `variant`      | `Steps` | `rail` (default), `cards`, or `plain`.                                                                |
| `toc`          | `Steps` | `ignore` (default) or `include`. Controls whether step headings appear in the page table of contents. |
| `headingLevel` | `Steps` | Heading level `2` (default) through `6` for every step title in the group.                            |
| `title`        | `Step`  | Required, nonempty literal title.                                                                     |
| `icon`         | `Step`  | Optional lowercase Lucide name. Decorative beside the title in HTML.                                  |

`<Steps>` accepts one or more direct `<Step>` children with nonempty bodies. The body accepts ordinary Markdown and supported components.

The same `<Step>` tag is also used in [Walkthrough](https://www.shoalrun.com/author/components/walkthroughs.md). Its parent selects a separate component contract:

| Parent          | `<Step>` attributes                                       | Output                                                               |
| --------------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| `<Steps>`       | `title`, optional `icon`                                  | Numbered procedure with configurable heading level and TOC behavior. |
| `<Walkthrough>` | `title`, optional code source and highlighting attributes | Code walkthrough with synchronized explanations.                     |

Use the attributes documented for the parent you are writing. The two forms do not share rendering or settings.

## Step headings and the page outline

Each step title renders as a real heading with an anchor ID. It defaults to `<h2>`; set `headingLevel` to match the surrounding page structure. Step headings are omitted from the page table of contents by default, keeping the outline focused when a page contains several procedures. Set `toc="include"` when readers should be able to jump to individual steps:

```mdx
<Steps toc="include" headingLevel="3">
<Step title="Install">Install the package.</Step>
<Step title="Configure">Add the configuration.</Step>
</Steps>
```

1. ### Install

   Install the package.

2. ### Configure

   Add the configuration.

The page's `tocDepth` frontmatter still applies. For example, `tocDepth: 2` omits the level-three steps above, while `tocDepth: 0` hides the whole outline. Markdown keeps an ordered list with headings at the chosen level and complete bodies.

## HTML, Markdown, and agents

HTML renders a semantic ordered list. Numbers, titles, and full bodies are visible without JavaScript or animation, including when CSS is unavailable. An icon never carries the only meaning. There are no controls, so ordinary link and code-block keyboard behavior applies.

Markdown keeps the complete ordered list and each step heading at the chosen level. An agent receives every instruction in sequence without needing the visual rail or cards.
