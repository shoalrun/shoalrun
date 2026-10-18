---
id: guide.component.timeline
title: Timelines
summary: Show the current milestone and overall progress through a process.
type: reference
canonical: /author/components/timeline
---

# Timelines

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Components > Timelines

**Updated: 2026-09-27.**

Use `<Timeline>` to show progress through an ordered set of milestones. Set `current` to the `id` of the milestone in progress. Earlier milestones become complete; later milestones become upcoming.

This is a **read-only progress display**. Readers can see the current stage, but they cannot mark milestones complete or move the bar. Update `current` in the source and rebuild the site when the shared process advances. Links inside milestone content work normally.

## When to use it

- Show which stage a product launch or feature rollout has reached.
- Show where a proposal sits in a draft, review, and approval process.
- Show progress through a published migration or deprecation plan.

An optional simulation mode could let readers move through the milestones to see each stage of a process. The current component shows only the published state; it has no next, previous, or reset controls.

```mdx
<Timeline current="review">
<Milestone id="draft" title="Draft">
Write the first version of the guide.
</Milestone>
<Milestone id="review" title="Review">
Check the guide with the team.
</Milestone>
<Milestone id="publish" title="Publish">
Make the approved guide available to readers.
</Milestone>
</Timeline>
```

1 of 3 milestones complete. Current: Review.

1. **Complete: Draft**

   Write the first version of the guide.

2. **Current: Review**

   Check the guide with the team.

3. **Upcoming: Publish**

   Make the approved guide available to readers.

The bar counts **completed** milestones. In this example it shows 1 of 3 complete; Review is still in progress. The current milestone also has a visible status label, and the HTML list marks it with `aria-current="step"`. The bar uses a native `<progress>` element with an accessible name. Markdown includes the same progress summary and status labels.

| Attribute | Where       | Required | Meaning                                                                         |
| --------- | ----------- | -------- | ------------------------------------------------------------------------------- |
| `current` | `Timeline`  | Yes      | The ID of the milestone in progress.                                            |
| `id`      | `Milestone` | Yes      | A unique ID using lowercase letters, numbers, and hyphens. Start with a letter. |
| `title`   | `Milestone` | Yes      | Visible milestone title.                                                        |
| `date`    | `Milestone` | No       | A real date in `YYYY-MM-DD` form. Rendered as `<time>` in HTML.                 |

Add one or more direct `<Milestone>` children in process order. Each milestone needs body content and can contain ordinary Markdown and supported components.

## HTML, Markdown, and agents

HTML shows the progress bar and milestone list with visible status labels; the current item has `aria-current="step"`. Markdown includes the same progress summary, status labels, and full milestone bodies. An agent can identify the current stage and read every milestone without interpreting the bar.
