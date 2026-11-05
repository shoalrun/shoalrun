# Independent product editions

This runnable example publishes a small Payments and Reporting documentation site from six source pages. Payments has v2 and v3 releases; Reporting has an independent v1 release. The operating checklist is one source with explicit membership in all three publications.

| Customer profile | Payments | Reporting | Feature grants |
| --- | --- | --- | --- |
| Customer A | v3 | v1 | Priority settlement and scheduled exports |
| Customer B | v2 | v1 | Neither optional feature |

From the repository root, build the CLI once with `npm --prefix framework run build`, then start either preview:

```sh
node framework/dist/cli.js dev framework/example-configs/products/docs.config.yaml /tmp/shoalrun-products-a --profile framework/example-configs/products/profiles/customer-a.yaml --port 8775
```

Open <http://127.0.0.1:8775/payments/v3/start> or <http://127.0.0.1:8775/reporting/v1/start>.

```sh
node framework/dist/cli.js dev framework/example-configs/products/docs.config.yaml /tmp/shoalrun-products-b --profile framework/example-configs/products/profiles/customer-b.yaml --port 8776
```

Open <http://127.0.0.1:8776/payments/v2/start> or <http://127.0.0.1:8776/reporting/v1/start>.

To include both Payments releases in the same preview, select `profiles/all-releases.yaml` instead. The publication dropdown then offers Payments v2, Payments v3, and Reporting v1. Customer profiles A and B expose only their selected releases.

Language labels are hidden automatically because this example publishes English only. Set `site.publicationSelector.showLanguage: false` to suppress language labels explicitly, or `true` to show them.

Inspect these differences:

- Customer A gets Payments v3 instructions and its priority settlement page. Customer B gets Payments v2 instructions.
- Both editions use Reporting v1, but only Customer A includes the scheduled exports page and feature-specific sections.
- Links from the shared operating checklist return to the current product and release.
- Editing the selected profile, SKU manifest, or page source refreshes the preview. For example, change Customer A's Payments selection from v3 to v2 while leaving Reporting at v1.

`requires` removes whole pages during compilation. `<ForFeature>` removes sections. Neither relies on browser reader filters. `profiles.requireClassification` checks every public source for an explicit `shared: true` or feature requirement.

For a static edition, replace `dev` with `build` and omit `--port`; pass the same profile and output directory. The data and workflows in this example describe a fictional product suite.
