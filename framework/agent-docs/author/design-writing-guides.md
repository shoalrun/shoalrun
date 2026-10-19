---
id: guide.design-writing-guides
title: Design a writing guide
summary: Give authors and agents clear editorial rules, examples, and review
  expectations.
type: explanation
area: authoring
subarea: authoring-writing
audiences:
  - authors
canonical: /author/design-writing-guides
---

# Design a writing guide

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Write with agents > Shared writing guidance > Design a writing guide

**Updated: 2026-10-19.**

A project writing guide explains your readers, terminology, and editorial decisions. Give your agent the guide's file path in project instructions so it can read the same rules as human authors.

## Put guidance in project configuration

Use `authoring` to give agents shared editorial instructions and file paths:

```yaml
authoring:
  directives: |
    Write for the reader's task. Verify technical claims against inspected sources.
    Use Steps for titled procedures; leave numbers out of headings.
  guideFiles:
    - content/writing-guide.mdx
  exemplarFiles:
    - content/reviewed-how-to.mdx
```

Paths are relative to `docs.config.yaml` and point to files your agent should read. `docs context` returns this guidance and its configuration owner. For a new page, your agent can read it with `config resolve`. Shoalrun validates the field shapes; it does not load these files into a model, run the instructions, or require a provider key. These authoring settings do not configure a model.

## State the decisions that matter

Describe who reads the docs, what they already know, and what they need to accomplish. Define preferred product names and terms, how to introduce unfamiliar concepts, and how much explanation different page types need.

Separate rules from preferences. Give a reason when it changes how a writer should decide. For example: “Use Steps for a titled procedure so readers can scan the sequence; leave numbers out of heading text.”

## Show reviewed examples

Pair a short rule with a concrete example or link to a reviewed page. Explain what makes the example useful. Choose examples for the same reader purpose: an API reference is a poor model for an introductory explanation.

Include ingredients, recipes, and cookbooks if your project uses them. Explain what belongs in a reusable action, a complete procedure, and a page that helps readers choose.

The [example writing guide](https://www.shoalrun.com/author/writing-style.md) shows this site's choices. Adapt it to your own readers rather than treating it as a required Shoalrun style.

## Define evidence and review expectations

Tell the agent to support changed technical claims with sources it has inspected, verify examples when possible, and report missing facts. Your agent handles source discovery and evidence gathering with its own tools. Keep editorial examples separate from factual sources.

Define what the reviewer needs: a diff, changed claims and their sources, check results, and unresolved questions. Do not treat a clean style report as approval to publish.

## Automate the repeatable rules

Use Vale or your preferred checker for rules it can assess reliably. Put the command and configuration path in project instructions. Keep judgment about clarity, technical accuracy, and reader usefulness in review.

Maintain the guide as a project file. Change a rule when reviewed work demonstrates a better choice, then update its examples and checker configuration together.

## Related reading

### Reference while working

- [Example writing guide](https://www.shoalrun.com/author/writing-style.md) — Read a complete project writing guide example.
