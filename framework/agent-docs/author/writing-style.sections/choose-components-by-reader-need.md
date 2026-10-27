---
id: reference.writing-style
title: Example writing guide
summary: Adapt this site's writing guide for your own documentation and agent
  instructions.
type: reference
area: authoring
subarea: authoring-writing
canonical: /author/writing-style
---

# Example writing guide

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Authoring reference > Example writing guide

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/author/writing-style.md)

This page is an example of a project writing guide. The rules below are the house style for Shoalrun's own documentation site, and authors and agents use them through project instructions. Shoalrun does not automatically apply these rules to other projects.

## Choose components by reader need

Choose the structure that helps readers use the information or complete the task.

| Need                                                          | Choice                                                                                                                     |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| A short ordered sequence without titled steps                 | An ordinary Markdown numbered list.                                                                                        |
| A procedure with a title and supporting content for each step | [Steps](https://www.shoalrun.com/author/components/steps.md).                                                              |
| Code that changes across steps with synchronized explanations | [Walkthrough](https://www.shoalrun.com/author/components/walkthroughs.md).                                                 |
| A prerequisite, caution, or consequence that needs emphasis   | [Callout](https://www.shoalrun.com/author/components/callout.md), with a specific label.                                   |
| Parallel facts such as fields, defaults, or alternatives      | A table with concise cells.                                                                                                |
| A choice between complete task paths                          | [CookbookChooser](https://www.shoalrun.com/author/components/cookbook-chooser.md), or recipe cards for a simple directory. |
| Recommended next pages                                        | [Related reading](https://www.shoalrun.com/author/related-reading.md), backed by configured relationships.                 |

Introduce every table with a sentence explaining what readers should use it for. Never place a table directly after a heading. The formatting check enforces this rule with `DocShape.TableIntroduction`.

Do not hide an essential instruction inside decoration. Every page documenting a component or presentation feature needs an **HTML, Markdown, and agents** section, or an existing clearly named equivalent. Explain what HTML shows or lets readers do, what Markdown retains or omits, and how an agent gets the information needed for the task. Include limitations and keyboard or JavaScript behavior when relevant. Check both rendered outputs.

A page that merely uses a callout, link, or Steps component needs the section only when that use changes access to information. Avoid generic claims that both formats are identical: explain the actual representation. Cookbook pages must distinguish their recipe links from the complete instructions in the linked recipes or a downloaded selection.
