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

## Attributes

These attributes configure the walkthrough layout and the content shown for each step.

| Element       | Attribute                         | Meaning                                                                                                                                              |
| ------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Walkthrough` | `title`                           | Required literal name, shown above the steps and used as the accessible name.                                                                        |
| `Walkthrough` | `layout`                          | Optional. `scroll`, the default, or `spotlight`.                                                                                                     |
| `Walkthrough` | `file`, `region`, `lines`, `lang` | Optional. [Shared code from a file](https://www.shoalrun.com/author/components/walkthroughs.md#take-code-from-a-file), in place of a code fence.     |
| `Step`        | `title`                           | Required literal step heading.                                                                                                                       |
| `Step`        | `highlight`                       | Optional lines to emphasize, such as `3-5` or `2,7-9`. Line 1 is the first line of the code.                                                         |
| `Step`        | `file`, `region`, `lines`, `lang` | Optional. [The step's code from a file](https://www.shoalrun.com/author/components/walkthroughs.md#take-code-from-a-file), in place of a code fence. |

A walkthrough needs at least two steps. Each step needs an explanation. In the default mode, a step's code fence must come last in the step. A step without code keeps the code pane on the step before it. When the walkthrough has shared code, steps can't add code. A `highlight` range past the end of the code fails the build.
