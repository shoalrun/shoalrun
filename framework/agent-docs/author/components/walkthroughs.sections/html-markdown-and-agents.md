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

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Components > Walkthroughs

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/author/components/walkthroughs.md)

Use `<Walkthrough>` to explain code step by step. Each step pairs an explanation with code built up across steps or read from a project file.

When there is room for two columns, explanations scroll on the left and code stays on the right. Scrolling or selecting a step updates the code pane. At either end, scrolling continues through the page. On narrower screens, each step shows its explanation and code in order.

The [spotlight layout](https://www.shoalrun.com/author/components/walkthroughs.md#choose-a-layout) uses step buttons instead of a scroller. Code that stays the same between steps slides to its new position, so readers can follow the changes.

Use a walkthrough when readers build up code or study one file in parts. For steps without code, use an ordinary numbered list.

## HTML, Markdown, and agents

Before scripts run, the HTML shows every step in order with its code. On screens too narrow for two columns, it stays that way. Readers who prefer reduced motion get the same pane without the movement.

In the side-by-side layout, each step's own code stays in the page but out of sight. Screen readers still hear code beside its explanation. The steps scroll with a mouse wheel or trackpad while the pointer is over the walkthrough. The pane's code is a labeled region that keyboard users can focus and scroll. Its **Copy** button copies the code on show and announces the result. Dimmed lines keep at least 4.5:1 contrast in every built-in palette. To change how far other lines fade, set `--walkthrough-dim` in [project CSS](https://www.shoalrun.com/author/css.md).

The Markdown twin replaces the pane with sections. The title becomes a bold line, and each step becomes a level-three heading such as `### Step 2: Check the signature`, followed by its explanation and its complete code. For a walkthrough with shared code, the code appears once before the steps. Each step then repeats the lines it explains, so an agent can quote a step without the rest of the file.
