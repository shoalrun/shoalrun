---
id: guide.component.walkthrough
title: Walkthroughs
summary: Build code tutorials that explain code one step at a time, with a
  scrolling pane in HTML and every step in Markdown.
type: reference
area: components
subarea: components-code
canonical: /author/components/walkthroughs
---

# Walkthroughs

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Walkthroughs

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/author/components/walkthroughs.md)

Use `<Walkthrough>` to explain code step by step. Each step pairs an explanation with code built up across steps or read from a project file.

When there is room for two columns, explanations scroll on the left and code stays on the right. Scrolling or selecting a step updates the code pane. At either end, scrolling continues through the page. On narrower screens, each step shows its explanation and code in order.

The [spotlight layout](https://www.shoalrun.com/author/components/walkthroughs.md#choose-a-layout) uses step buttons instead of a scroller. Code that stays the same between steps slides to its new position, so readers can follow the changes.

Use a walkthrough when readers build up code or study one file in parts. For steps without code, use an ordinary numbered list.

## Take code from a file

Code in a fence can drift from the code your project runs and tests. To show the real file instead, set `file` on a `<Step>` in place of its code fence, or on `<Walkthrough>` in place of its shared fence. The path is relative to the page.

```mdx
<Step title="Check the signature" file="../../examples/webhook.ts" region="verify" highlight="2-4">

Compare the header with a signature of the body.

</Step>
```

| Attribute | Meaning                                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `file`    | Path to the code file, relative to the page. The pane and code toolbar show the file name.                                                          |
| `region`  | Optional. Takes the lines between a `#region name` comment and its `#endregion` comment, without the markers, and removes their shared indentation. |
| `lines`   | Optional. Takes one range of lines, such as `12-30`. Use `region` or `lines`, not both.                                                             |
| `lang`    | Optional. The code language, when the file extension doesn't name one.                                                                              |

Prefer `region` for files that change. Region comments move with the code, while a `lines` range points at the wrong lines after an edit above it. Line numbers in `highlight` count from the first line shown, not from the top of the file.

Most languages accept region comments, such as `// #region verify` in TypeScript or `# region verify` in Python and YAML. A marker starts its line, after an optional comment opener, so `#region` inside code or a URL doesn't count. The name is the first word, and text after it, such as `// #region verify: check the signature`, is a description. Regions can nest, and an end marker can repeat its name, such as `// #endregion verify`, to show which region it closes. Give each region its own name. Every marker in the file must pair up. A stray or mismatched `#endregion` fails the build with its line number instead of cutting a region short. A file must be inside the Git repository that holds the page, or inside the project directory when there is no repository. The build refuses other paths, so a docs change can't publish files from elsewhere on the build machine. A missing file, region, or range fails the build. Files the walkthrough reads are listed as build dependencies, and `shoalrun dev` rebuilds when one inside the project changes.
