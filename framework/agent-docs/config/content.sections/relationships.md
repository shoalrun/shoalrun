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

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Configuration reference > Authoring and content

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/config/content.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Learn how files combine and how to validate configuration changes.

Configure authoring guidance, page defaults, reusable content, reading paths, and reader views. These keys belong in `docs.config.yaml` or an included configuration file. For file composition and validation commands, see [Configure your project](https://www.shoalrun.com/configuration.md). Use the [configuration index](https://www.shoalrun.com/config.md) to find another setting.

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
