---
id: reference.config-outputs
title: Output and export settings
summary: Configure application exports, PDF styling, Markdown headers, and
  discovery indexes.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config/outputs
---

# Output and export settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Configuration reference > Output and export

**Updated: 2026-11-06.**

Parent page: [Full Markdown page](/config/outputs.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Learn how files combine and how to validate configuration changes.

Configure metadata providers, application exports, Markdown headers, and discovery indexes. These keys belong in `docs.config.yaml` or an included configuration file. For file composition and validation commands, see [Configure your project](https://www.shoalrun.com/configuration.md). Use the [configuration index](https://www.shoalrun.com/config.md) to find another setting.

## PDF output

Since 0.1.0-beta.1

Use `outputs.pdf` for shared PDF styling and `exports.<target>.pdf` for target overrides. Enable the optional page action separately with `outputs.html.pdf`; it's off by default. See [Export styled PDFs](https://www.shoalrun.com/publish/pdf.md) for complete commands, settings, local asset requirements, and the static or on-demand delivery choices.

```yaml
outputs:
  pdf:
    size: A4
    stylesheet: ./styles/print.css
    footer: "{page} / {pages}"
  html:
    pdf:
      mode: print
      label: Print PDF
      placement: after
```

PDF formats use their own export bundle; they aren't Content REST page representations. Browser print mode uses a shared branded layout, CSS, and fonts from `outputs.pdf`, with optional named-target styling through `outputs.html.pdf.style`. It generates no page PDFs or print documents. Optional manual downloads come from explicit CLI exports. Endpoint mode requires a Node host with Chromium. Header and footer text accepts `{title}`, `{page}`, and `{pages}` placeholders; browser views use browser-supported CSS page margins.
