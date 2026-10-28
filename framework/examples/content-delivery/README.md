# Use pages, sections, and snippets in an application

This example uses the public `@shoalrun/cli/content` client to show a whole
billing guide, its independently approved refund section, and two simultaneous
copies of one reusable policy snippet. The app owns the drawer, buttons, focus,
and styling. Shoalrun supplies passive content and typed resource references.

Copy this directory into a project with Shoalrun installed. From the copied
example directory, run:

```sh
npx --no-install shoalrun export docs.config.yaml --target app-help --out public/help/releases/demo
node preview.mjs
```

Open `http://127.0.0.1:8775/settings/billing`. Choose **Billing guide** to read the
page or **How to request a refund** to read only its named section. Follow the
section's billing-overview link. Both cards display the same snippet, with
independent footnote anchors. Escape closes the drawer and restores focus.

The preview resolves the installed package's public `@shoalrun/cli/content`
entrypoint and serves only its browser-safe modules. It does not serve arbitrary
package or project files. In a real app, import that entrypoint through your
existing browser bundler.

## Author the resources

The page gives its root heading a stable ID with
`## Request a refund <Anchor id="refunds" />`. Its page metadata separately
declares `{ id: refunds, context: section }` in `standaloneSections`, approving
that section as useful without the page introduction.

The export target selects a page reference, a section reference, and a named
snippet instance with a fixed `days` value. `snippets/refund-window.mdx` is also
included in the page, so the reusable wording stays in one source. Snippet
content is block content; this example does not insert it inside a button or
promise that arbitrary snippets are suitable for inline tooltips.

## Keep serving independent from presentation

`app.js` opens a snapshot with `openManifestContentSource`, reads resources by
typed reference, and uses `mountContent` for the HTML. Each mount receives fresh
DOM IDs and remapped anchors. The drawer aborts superseded requests and ignores
late results after closing. These are application behaviors, not server duties.

The preview also serves the read-only REST API at `/content/v1`. Open
`http://127.0.0.1:8775/settings/billing?delivery=rest` to use
`openRestContentSource` through the same snapshot interface. Both modes deliver
identical content and use the same application rendering code.

The server uses `createContentRestHandler` from `@shoalrun/cli/content/server`.
It pins one approved snapshot per publication at startup and retains no revision
history. All requests select `channel`, `version`, and `language`. List resources
first, then use the returned key and revision for subsequent reads:

```sh
curl 'http://127.0.0.1:8775/content/v1/resources?channel=production&version=current&language=en'
```

`GET /resources/{key}` returns metadata; `GET
/resources/{key}/representations/{format}` returns HTML or Markdown. Append the
same publication parameters and `revision` returned by the list. HEAD and
conditional requests with `If-None-Match` are supported. The complete
[OpenAPI contract](../../schemas/content-rest.openapi.json) describes responses,
errors, and caching. The HTTP contract's `v1` is separate from package versions.

Keep `/help/releases/demo/` served alongside the API: the REST adapter preserves
exported bytes, including static links and asset URLs. Browser clients require
the application origin and HTTPS or localhost. This local example does not add
authentication, search, editing, or a production hosting service.

## Publish complete revisions

The example uses `/help/releases/demo/` as a fixed demonstration revision.
Production should use a new directory and matching `publicBase` for each release,
upload the complete export, and only then update the app's manifest URL or
release pointer. Retain revisions still used by open clients. Do not overwrite
files underneath an existing snapshot.

Use `--previous-manifest PATH --fail-on-removed` to detect removed public resource
references before replacing output. Without a baseline, the export reports that
removal coverage was unavailable. API review candidates are not approved content:
the client refuses a manifest whose review status is `required`.

The content comes from this project's trusted build. The client checks the
manifest and content digests; these establish consistency with that manifest,
not trust in an arbitrary third-party publisher. Preserve the export's notices.
