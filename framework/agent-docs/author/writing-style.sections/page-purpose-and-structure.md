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

**Updated: 2026-10-28.**

Parent page: [Full Markdown page](/author/writing-style.md)

This page is an example of a project writing guide. The rules below are the house style for Shoalrun's own documentation site, and authors and agents use them through project instructions. Shoalrun does not automatically apply these rules to other projects.

## Page purpose and structure

Choose the page type by the reader's goal and the actual content. Keep one primary purpose per page. Split substantial conceptual discussion from a procedure and connect the pages with related reading.

| Page type       | Reader goal                                    | Useful structure                                                                                                                                                                        |
| --------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tutorial        | Learn through a guided exercise.               | Outcome, prerequisites, one reliable path with sample values, visible results, and a final check. Explain only what the exercise needs; link to deeper discussion.                      |
| How-to          | Complete a specific task.                      | Starting state, necessary prerequisites, actions in execution order, success check, and likely failures. Put decisions before the steps they affect.                                    |
| Reference       | Look up an exact fact.                         | When the feature applies, syntax or fields, defaults, constraints, examples, and errors. Organize facts for lookup.                                                                     |
| Explanation     | Understand a concept or design.                | The question being explained, definitions, a concrete example, reasons and tradeoffs, and links to practical tasks.                                                                     |
| Ingredient      | Reuse one task step in several recipes.        | Required inputs and prerequisites, one action with its instructions, named outputs, and an observable check. Keep the step independent of any recipe's position or neighboring wording. |
| Recipe          | Complete one task from a known starting state. | Outcome, prerequisites, ordered actions, failure guidance, and a final success check. Include everything needed to follow the published page on its own.                                |
| Cookbook        | Choose between complete recipes.               | Explain who each path is for, what it needs, and what it produces; link to the published recipe pages. State whether choices are alternatives or can be combined.                       |
| Changelog entry | Understand a dated change.                     | User-visible behavior, scope, migration when needed, and limitations. Say when a change concerns the private prototype; claim a release only with release evidence.                     |

Use **Before you begin**, **Check the result**, and **Next steps** for recurring task sections when revising a procedure. Keep action headings specific to the task. Existing tutorials can retain established headings when tools or incoming fragments depend on them. A short procedure may put prerequisites in its introduction; omit sections that add no useful information.

Component references use **Syntax**, **Attributes**, and **HTML, Markdown, and agents** for predictable lookup. Document required values, defaults, accepted types, and constraints in Attributes; say when a component takes no attributes. Keep feature-specific examples and errors under descriptive headings. Fenced-code options and configured site features can use their own precise labels. Preserve old fragment IDs when changing a heading.

Use **Next steps** to continue a task and **Related reading** for supporting reference or explanation. Describe why to follow each link. Keep demo headings separate from the page's instructional outline where possible.

Run customer commands from a project with the pinned npm package installed, using `npx --no-install shoalrun`. Label contributor-only paths and repository scripts explicitly. Do not assume the quickstart compiled a framework checkout. Recipes maintained through composition must declare every required artifact, including a current build before an export.

These are editorial shapes, not a reason to add empty boilerplate. Follow the [template rules](https://www.shoalrun.com/author/templates.md) and adapt the outline to the reader's need. Headings in a page body start at level two because the renderer supplies the title. Do not add step numbers to authored headings. For a procedure with titled steps, use the [Steps component](https://www.shoalrun.com/author/components/steps.md); it supplies the numbering in HTML and Markdown.
