---
id: reference.writing-style
title: Example writing guide
summary: Adapt this site's writing guide for your own documentation and agent
  instructions.
type: reference
canonical: /author/writing-style
---

# Example writing guide

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Write with agents > Shared writing guidance > Example writing guide

**Updated: 2026-10-17.**

This page is an example of a project writing guide. The rules below are the house style for Shoalrun's own documentation site, and authors and agents use them through project instructions. Shoalrun does not automatically apply these rules to other projects.

## Adapt this example

Save your team's writing guide in the project and give your agent its path in project instructions. Include reviewed examples appropriate to the page type. Configure your own Vale rules for automated checks. [Design a writing guide](https://www.shoalrun.com/author/design-writing-guides.md) explains how to choose useful rules and examples.

## Example audience and scope

Write for someone trying to understand or complete a task in Shoalrun. Assume they can edit a text file; introduce framework-specific concepts before relying on them. State prerequisites when a task needs terminal, Git, API, or deployment knowledge.

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

These are editorial shapes, not mandatory heading names. Follow the [template rules](https://www.shoalrun.com/author/templates.md) and adapt the outline to the reader's need. Headings in a page body start at level two because the renderer supplies the title. Do not add step numbers to authored headings. For a procedure with titled steps, use the [Steps component](https://www.shoalrun.com/author/components/steps.md); it supplies the numbering in HTML and Markdown.

## Voice and explanations

Address the reader as “you.” Use active voice and concrete verbs. Start a paragraph with its main point, then supply the reason or example needed to understand it. Keep sentences short enough to follow without breaking every thought into a separate paragraph.

Name the action and its result. Replace claims such as “powerful,” “seamless,” and “easy” with behavior the reader can observe. Avoid inflated words, ceremonial introductions, repeated summaries, and invented terminology.

| Before                                                            | Better                                                                                                                    | Reason                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `Utilize the configuration to leverage publication capabilities.` | “Set the channel and version in the page's frontmatter.”                                                                  | Names the fields and action.                 |
| `It is important to note that a Markdown twin is generated.`      | “The build creates a Markdown copy of each published page.”                                                               | Identifies the actor and defines the result. |
| “Run CI to validate it.”                                          | “Run the project's automated checks. Continuous integration (CI) runs those checks when code changes.”                    | Explains the acronym and mechanism.          |
| “Hybrid improves relevance.”                                      | “Hybrid search combines word matching and vector rankings. Whether it helps depends on the queries and ranking settings.” | Defines the term and limits the claim.       |

Define an unfamiliar term at its first useful appearance, even when the glossary also defines it. Explain acronyms before using them repeatedly. Prefer one small example to a chain of new terms. Preserve exact command, field, model, and component names in code formatting.

## Procedures and examples

Show the starting directory, required inputs, and expected result when a command depends on them. Say which values readers must replace. Keep commands supported by source or verified behavior; do not invent flags to make an example look complete.

Give each procedure step one purpose. Put the explanation beside the action it supports. Include a check that readers can perform and describe what success looks like. Troubleshooting should identify a symptom, likely cause, and concrete next action.

Examples demonstrate the feature under discussion. Use the smallest example that still shows the important behavior. Preserve required fields, defaults, constraints, and meaningful errors during a rewrite. An example copied from a different page is not evidence that it applies to this task.

## Ingredients, recipes, and cookbooks

Use a recipe for a task that should participate in the recipe and cookbook features. A recipe can be authored directly; ingredients and a composition spec are optional. Use ingredients when multiple recipes share instructions you want to maintain once. Use a cookbook when readers need help choosing a complete path. See [how these page types fit together](https://www.shoalrun.com/author/recipes.md).

For an ingredient, name what must already be available and what success makes available to the next step. When using `workflow` metadata, keep `inputs` and `outputs` consistent across the recipe and include the required `check`. State a check the reader can perform, such as “the build reports success and both output files exist,” rather than “make sure it works.” Metadata declares handoffs; it does not run commands or verify their results. Keep essential instructions in the body.

For a recipe, choose the order deliberately and explain how to recover from a failed step. The published recipe must contain the complete instructions; readers should not need to assemble ingredients themselves. Review assembled drafts before publication. Do not describe passing assembly checks as proof that the procedure succeeds. [Compose and maintain recipes](https://www.shoalrun.com/author/recipe-drafts.md) explains the authoring workflow.

For a cookbook, describe each choice's starting state and outcome. Use single selection for alternative or overlapping paths, such as build versus build-and-audit. Offer multiple selection only when the recipes make sense together. A chooser displays published recipes; it does not deduplicate their steps, connect dependencies, or execute them. If a combined task needs shared setup and explicit handoffs, write one complete recipe for it. [Configure a cookbook](https://www.shoalrun.com/author/cookbooks.md) explains the options.

Check each ingredient's instructions and each recipe's full outcome. Inspect the cookbook's HTML choices and Markdown recipe links. Keep prerequisites, failure guidance, and success checks readable in both formats.

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

Do not hide an essential instruction inside decoration. For component references, include supported syntax, attributes and limits, and an **HTML, Markdown, and agents** section. Explain keyboard behavior when there are controls, behavior without JavaScript, and the content available in Markdown. Check both rendered outputs.

## Evidence and uncertainty

Distinguish implemented behavior, measured observations, and planned work. State a benchmark's inputs and scoring rule before drawing conclusions. A result from one task or model does not establish general reliability.

When evidence does not specify a fact, say what is missing. An undocumented policy is not proof that no policy exists. Keep a visible TODO in an unpublished draft and record the missing fact for review. Do not remove uncertainty just to clear a style check. Resolve it with evidence before publication.

Preserve stable IDs, routes, publication metadata, and access policy during a prose edit. Use stable document links. Set the edit date without changing an entry's original change date. Report changes to identity, scope, or technical claims explicitly for review.

## Reviewed writing examples

These pages illustrate specific editorial choices. Copy their approach, then verify the facts for the page being written.

| Example                                                                                                      | What to learn from it                                                                                                  |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| [Getting started](https://www.shoalrun.com/start.md)                                                         | One guided exercise, explicit prerequisites, working-directory context, and observable preview results.                |
| [Add a page](https://www.shoalrun.com/author/add-page.md)                                                    | A practical starting state, actions in order, and checks before publication.                                           |
| [Steps reference](https://www.shoalrun.com/author/components/steps.md)                                       | Syntax beside live examples, exact attributes and defaults, and complete output behavior.                              |
| [Agent-friendly documentation](https://www.shoalrun.com/publish/agent-friendliness.md)                       | Definitions, reasons for the design, concrete discovery paths, and limits. Match its reasoning rather than its length. |
| [Build-site ingredient](https://www.shoalrun.com/ingredients/build-site.md)                                  | Named inputs and outputs, a focused action, and an observable handoff check.                                           |
| [Build-and-audit recipe](https://www.shoalrun.com/recipes/audit-docs.md)                                     | Complete ordered instructions with prerequisites and a final task outcome.                                             |
| [Site workflows cookbook](https://www.shoalrun.com/cookbooks/site-workflows.md)                              | Clear choices between overlapping complete paths and links to their recipes.                                           |
| [Agent authoring, search, and documentation answers](https://www.shoalrun.com/changelog/authoring-search.md) | Reader-visible behavior, precise scope, and an explicit private-prototype qualification.                               |

## Review a draft

Check purpose, organization, definitions, factual support, examples, and the success check. Compare technical details with the original source. Run the compiler and Vale, then inspect HTML and Markdown. This site's Vale configuration enables Voices, Direct, and Shoalrun; those rules catch detectable wording and structure problems. Passing them does not establish factual accuracy or usefulness.

Give your agent this guide and an example appropriate to the page's purpose. Examples guide structure and tone; verify technical claims against the relevant sources.

## Related reading

### Reference while working

- [Design a writing guide](https://www.shoalrun.com/author/design-writing-guides.md) — Adapt editorial rules to your own readers.

- [Templates](https://www.shoalrun.com/author/templates.md) — Look up page types, starter structures, and formatting checks.
