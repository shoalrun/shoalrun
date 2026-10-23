---
id: reference.config
title: Configuration reference
summary: Every top-level setting in docs.config.yaml, with defaults, validation
  rules, and links to the full guides.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config
---

# Configuration reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference

**Updated: 2026-10-23.**

Parent page: [Full Markdown page](/config.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [How Shoalrun works](https://www.shoalrun.com/concepts.md) — Understand publications, stable IDs, and config composition before changing settings.

A project's config starts at `docs.config.yaml`. The CLI looks for that name by default, and `shoalrun scaffold -n` searches parent directories for it. For the configuration workflow, composition rules, and debugging, start with [configure your project](https://www.shoalrun.com/configuration.md). This page lists every top-level key. Keys with a dedicated guide link there for the full rules. For complete, working configs, see [example configs](https://www.shoalrun.com/config/examples.md).

The root file must be a YAML mapping with `schemaVersion: 1`. YAML is parsed strictly: duplicate keys fail. Any top-level key not listed here fails with `unknown setting <key>`. Keys nested inside `site`, `apis`, `publications`, and `outputs` are not all checked yet, so check spelling there carefully.

```yaml title="docs.config.yaml"
schemaVersion: 1
site:
  title: Example documentation
publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }
navigation: { $include: ./config/nav.yaml }
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
