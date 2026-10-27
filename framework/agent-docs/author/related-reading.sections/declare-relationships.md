---
id: guide.related-reading
title: Related reading
summary: Relationship fields, purposes, ordering, validation, and rendered
  reading paths.
type: reference
area: components
subarea: components-navigation
canonical: /author/related-reading
---

# Related reading

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Related reading

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/author/related-reading.md)

A relationship is an authored connection between two pages, with a reason to follow the link. Use related reading for prerequisites, next steps, references, and distinctions that help readers choose where to go. The links use stable document IDs and remain in the current publication. For curated cards and filtered collections, see [cards and collections](https://www.shoalrun.com/author/components/cards.md).

## Declare relationships

A **relationship** is an explicit connection between two pages, with a reason to follow the link. For example, a guide can point to the task readers should do next, a prerequisite they should read first, or a useful reference. These connections express your intended reading path; sidebar position and shared operation IDs do not establish that order.

Keep the connections in a central config fragment so pages can display them without repeating the target IDs and reasons in their content:

```yaml title="docs.config.yaml"
relationships: { $include: ./config/relationships.yaml }
```

```yaml title="config/relationships.yaml"
- id: cards-to-output
  from: guide.related-reading
  to: guide.output
  type: next-step
  reason: Inspect the HTML, Markdown, and manifests produced by the build.
  order: 10
```

| Field        | Meaning                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| `id`         | Unique relationship ID.                                                                                     |
| `from`, `to` | Stable document IDs.                                                                                        |
| `type`       | A relationship purpose from the table below.                                                                |
| `reason`     | Required text explaining why the target is useful.                                                          |
| `order`      | Optional finite number; smaller values come first, with relationship ID as the tie-breaker. Default is `0`. |

Relationship types describe why a reader should follow the link:

| Type                | Purpose / default group heading                      | Direction              |
| ------------------- | ---------------------------------------------------- | ---------------------- |
| `prerequisite`      | Read first — knowledge needed before this page.      | From source to target. |
| `next-step`         | Next steps — continue the workflow.                  | From source to target. |
| `reference`         | Reference while working — look up details.           | From source to target. |
| `advanced`          | Go deeper — explore a more advanced topic.           | From source to target. |
| `see-also`          | Related topics — parallel or complementary material. | Both directions.       |
| `not-confused-with` | Often confused with — distinguish two topics.        | Both directions.       |

Declare symmetric pairs only once and write a reason that makes sense from either page. For `not-confused-with`, explain the actual distinction in the reason. A prerequisite target is something to read before the source.

Unknown document IDs, self-links, duplicate IDs, duplicate edges of the same type, and prerequisite cycles within a public publication fail. Different relationship types can connect the same pair. Next-step cycles are allowed for workflows with a return step; provide meaningful reasons.

A relationship is published only where both documents have public variants in the same channel, version, and language. Edges to drafts or unavailable variants are omitted from related reading and the public manifest. A relationship does not publish its target or create a cross-version link.
