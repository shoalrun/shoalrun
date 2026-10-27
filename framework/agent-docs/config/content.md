---
id: reference.config-content
title: Authoring and content settings
summary: Configure authoring guidance, page defaults, reusable content, reading
  paths, and reader views.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config/content
---

# Authoring and content settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference > Authoring and content

**Updated: 2026-10-27.**

Configure authoring guidance, page defaults, reusable content, reading paths, and reader views. These keys belong in `docs.config.yaml` or an included configuration file. For file composition and validation commands, see [Configure your project](https://www.shoalrun.com/configuration.md). Use the [configuration index](https://www.shoalrun.com/config.md) to find another setting.

## `authoring`

Optional project guidance and read-only source locations. These settings do not choose a model or read external files during a site build.

| Key             | Meaning                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `directives`    | Nonempty project writing instructions.                                                                                          |
| `guideFiles`    | Project-relative writing-guide paths.                                                                                           |
| `exemplarFiles` | Project-relative reviewed examples.                                                                                             |
| `sourceRoots`   | Named local folders for source search. Each entry has `path`, optional `name`, and optional `include` and `exclude` glob lists. |
| `pageSources`   | Stable page IDs mapped to source file paths or globs. These seed evidence selection for known features.                         |

Source paths resolve from the root configuration directory. Source folders and page-source files may be outside the docs project; guide and exemplar paths remain inside it. URLs are not source folders. Git is not required. Your coding agent selects the evidence scope under its own permissions.

```yaml title="docs.config.yaml"
authoring:
  sourceRoots:
    - name: Application implementation
      path: ../application/src
      include: ["**/*.ts", "**/*.tsx"]
      exclude: ["**/*.test.ts"]
  pageSources:
    guide.authentication:
      - ../application/src/authentication.ts
```

Project discovery reports these configured source locations. Use your coding agent's own search and read tools, with its execution permissions, to investigate external implementation files. `docs source` reads only paths inside the project. See [authoring tools commands](https://www.shoalrun.com/author/workspace/commands.md) for current discovery and validation commands.

## `frontmatter`

Global `defaults`, `enforced` values, per-language formatting `locales`, custom `fields` declarations, and `changelogIdentifier`. Pages can replace defaults but not enforced values. `id` and `slug` can't be set globally. See [frontmatter](https://www.shoalrun.com/author/frontmatter.md) and [release notes and changelog](https://www.shoalrun.com/author/release-notes.md).

Let pages leave out common values:

```yaml title="config/frontmatter.yaml"
defaults:
  type: guide
  channel: production
  version: current
  access: { policy: public }
```

Force a value on every page:

```yaml title="config/frontmatter.yaml"
enforced:
  audiences: [partners]
```

Choose what identifies each changelog entry. The default is `either`; `date` and `version` are also available:

```yaml title="config/frontmatter.yaml"
changelogIdentifier: either
```

Here `version` means the page's `releaseVersion` field, not the documentation publication version.

Declare custom fields. `public: true` lets a field appear in the Markdown twin's header:

```yaml title="config/frontmatter.yaml"
fields:
  owner:
    type: string
    required: true
    description: Team that maintains the page.
  agent.intent:
    type: string
    public: true
  reviewStatus:
    type: string
    enum: [draft, reviewed, approved]
```

## `variables`

A mapping of project-wide values for [snippets](https://www.shoalrun.com/author/snippets.md). They override snippet defaults and are overridden by page `variables` and invocation values. Values are strings, numbers, or booleans.

```yaml title="docs.config.yaml"
variables:
  product: Payments
  supportEmail: support@example.com
  retryLimit: 3
  betaFeatures: false
```

A page overrides a project value for itself:

```yaml title="content/sandbox-guide.mdx (frontmatter)"
variables:
  product: Payments sandbox
```

A single include overrides both:

```mdx title="content/sandbox-guide.mdx"
<Snippet id="payment.request-prep" values={{ product: "Payments test mode" }} />
```

## `snippets`

A mapping from snippet ID to `{ file, variables }`. Each variable has a `type` (`string`, `number`, or `boolean`) and optional `required`, `default`, and `enum`. See [snippets](https://www.shoalrun.com/author/snippets.md).

A snippet with no variables:

```yaml title="config/snippets.yaml"
legal.beta-notice:
  file: ../snippets/beta-notice.mdx
```

Required and default values:

```yaml title="config/snippets.yaml"
payment.request-prep:
  file: ../snippets/request-prep.mdx
  variables:
    product: { type: string, required: true }
    header: { type: string, default: Idempotency-Key }
```

A value limited to a list, and a number:

```yaml title="config/snippets.yaml"
limits.rate:
  file: ../snippets/rate-limit.mdx
  variables:
    plan: { type: string, enum: [free, team, enterprise], default: free }
    perMinute: { type: number, required: true }
```

## `templates`

An optional mapping from template ID to `{ type, body, required }`. Built-in templates need no registration; reuse a built-in ID to override it or add a custom ID. `type` becomes the new page's `type`, and `body` is a `.md` or `.mdx` file that can open with commented frontmatter. The only `required` value is `operations`. See [templates](https://www.shoalrun.com/author/templates.md).

```yaml title="config/templates.yaml"
how-to:
  type: how-to
  body: ../templates/how-to.mdx
```

Override the built-in API reference while retaining its operation requirement:

```yaml title="config/templates.yaml"
api-reference:
  type: api-reference
  body: ../templates/api-reference.mdx
  required: [operations]
```

Replace a built-in template by reusing its ID:

```yaml title="config/templates.yaml"
guide:
  type: guide
  body: ../templates/our-guide.mdx
```

## `callouts`

Custom callout `types` and color `tones`. A type has a `label`, a `tone`, and an optional Lucide `icon`. A tone has `line`, `background`, and `text` colors, and an optional `dark` set. See [callouts](https://www.shoalrun.com/author/components/callout.md) for configuration examples and contrast requirements.

## `badges`

`badges.variants` adds or overrides inline badge colors. Each lowercase kebab-case name needs `light.background` and `light.text` hex colors; `light.border` is optional and defaults to the text color. Add the same fields under `dark` when the site uses dark or system mode. The build checks badge text contrast in every shown mode. See [Badges](https://www.shoalrun.com/author/components/badge.md) for the built-in variant table and a separate custom `partner` example.

## `cookbooks`

Optional mapping of cookbook IDs to a chooser title and ordered reader options. Each option has a unique `id`, `label`, and `doc` ID for a public `type: recipe` page in the same publication as the chooser. The build rejects duplicate options and unavailable targets. Set `mode: single` for alternative goals or use `mode: multiple` (the default) for compatible recipes. Optional option fields `when`, `needs`, and `outcome` explain each choice. The browser loads selected published recipe content in configured order and supports selection links, Markdown downloads, and printing. The [CookbookChooser reference](https://www.shoalrun.com/author/components/cookbook-chooser.md) shows a live example and the HTML and Markdown behavior.

```yaml title="docs.config.yaml"
cookbooks: { $include: ./config/cookbooks.yaml }
```

## `relationships`

A list of authored links between pages, with `id`, `from`, `to`, `type`, `reason`, and optional `order`. `type` is `prerequisite`, `next-step`, `reference`, `advanced`, `see-also`, or `not-confused-with`. See [related reading](https://www.shoalrun.com/author/related-reading.md).

A reading path through three pages:

```yaml title="config/relationships.yaml"
- id: auth-before-payment
  from: guide.create-payment
  to: guide.authentication
  type: prerequisite
  reason: Create an API key before sending a payment request.
- id: payment-then-refund
  from: guide.create-payment
  to: guide.refunds
  type: next-step
  reason: Refund a payment that was created by mistake.
```

Order links in a group. Lower numbers come first:

```yaml title="config/relationships.yaml"
- id: payment-reference
  from: guide.create-payment
  to: reference.create-payment
  type: reference
  reason: Check every request field and error code.
  order: 1
- id: payment-errors
  from: guide.create-payment
  to: guide.handle-errors
  type: reference
  reason: Look up what each decline code means.
  order: 2
```

Two-way links. Declare `see-also` and `not-confused-with` once; both pages show them:

```yaml title="config/relationships.yaml"
- id: refunds-vs-disputes
  from: guide.refunds
  to: guide.disputes
  type: not-confused-with
  reason: A refund is sent by you; a dispute is started by the cardholder's bank.
```

## `readerFilters`

Optional reader views for one site. `facets` maps each stable facet ID to a reader-facing `label` and an `options` map of stable choice IDs to labels. `typeDefaults` optionally marks all pages of a document type unless a page supplies a value for that facet. `controls` selects sidebar and header pickers; `module` names a local browser module for custom controls. The first visit shows all content. See [reader views](https://www.shoalrun.com/author/reader-views.md) for page and section marks, controls, saved choices, and share links.

```yaml title="docs.config.yaml"
readerFilters:
  facets:
    audience:
      label: Reader
      options: { ui: Use the UI, developer: Build with the API }
  typeDefaults:
    api-reference: { audience: [developer] }
```

## Related reading

### Read first

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Learn how files combine and how to validate configuration changes.

### Reference while working

- [Configuration reference](https://www.shoalrun.com/config.md) — Find configuration settings in another topic.
