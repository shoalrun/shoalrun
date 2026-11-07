# Additional information in a selected build

This example uses one shared page, with an internal operations section. It needs
no customer profile or feature manifest. From this directory, with Shoalrun installed:

```sh
shoalrun build docs.config.yaml dist/complete
shoalrun build customer.config.yaml dist/customer
shoalrun serve dist/complete --port 8771
```

Open <http://127.0.0.1:8771/>. In another terminal, serve the customer output:

```sh
shoalrun serve dist/customer --port 8772
```

Open <http://127.0.0.1:8772/>. Both sites show **Review a bill** and **Get help**.
Only the complete build has **Check the retry queue**. Check `index.md` and
`search-index.json` in each output: the customer files must contain neither that
heading nor its instructions. The unfiltered build includes all valid blocks.

**Unmarked sections stay included. Unmarked pages are excluded when a selected
facet has no matching page mark.** This page explicitly belongs to both audiences.
`<ForFacet audience="internal partner">` would accept either choice if both were
configured; multiple facet attributes must all match. A facet the build doesn't
filter passes automatically. Selection removes sections rather than swapping
variants. Use positive literal matches only.

`<ReaderSection>` is different: it hides content in browser views while publishing
it in output files. Never use it to omit internal instructions from a customer
build. Build-time omission doesn't authenticate the complete site's deployment.

After each successful build, `.shoalrun/content-selection.json` records its target
and section decisions. Follow its `receipt` path for the artifact-specific copy;
these reports belong outside served output. Portable exports need their own
`contentFilter`; PDF exports inherit the site's filter unless overridden.
