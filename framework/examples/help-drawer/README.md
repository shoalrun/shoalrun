# Use exported content in a help drawer

This is a plain JavaScript consumer of Shoalrun's content export. It has no
Shoalrun runtime dependency. The host app owns the buttons, drawer, and routing.

Copy this directory into your application or documentation project first. With
Shoalrun installed in that project, run from the copied example directory:

```sh
shoalrun export docs.config.yaml --target app-help --out public/help
node preview.mjs
```

Open `http://127.0.0.1:8774/settings/account`. The included preview server mounts the export at `/help/`. To use another development server, serve `index.html` and `app.js` at your app root and mount `public/help` at
`/help/`. Your development server should serve `index.html` for app routes such
as `/settings/account`, without changing the `/help/` mount. Open the key and
billing help buttons; follow the in-drawer links and inspect the images.
The full account guide is omitted from the export and links to the configured
example documentation host; replace that origin for your own project.

`manifest.json` maps stable document IDs to representation files. `app.js`
fetches the HTML, inserts it into one content container, and intercepts anchors
marked `data-export-link`. The corresponding manifest link supplies the target
document ID and original fragment. Other links use their ordinary destinations.

`/help/` is an example path, not a required Shoalrun directory. You can choose
another root-relative path, such as `/resources/`. Set `publicBase` to that path,
serve the bundle there, and update the manifest URL in `app.js` to match (for
example, `/resources/manifest.json`). The included preview server uses `/help/`;
configure your own server when choosing a different mount. The `--out` directory
is a filesystem destination and does not have to share the URL path's name.

`publicBase` must match where the bundle is served. Fragment image URLs resolve
against the app page, so they use this configured root-relative mount rather
than the directory from which the fragment was fetched. The host app's CSS
styles the static content; all substantive content is readable without it.

This example inserts trusted output from its own documentation build. It does
not accept arbitrary remote HTML. Mount a given exported document only once
per DOM; repeated simultaneous instances require the host to rewrite IDs and
all corresponding fragment and ARIA references.

The component example imports the installed `@shoalrun/cli/components` authoring
helpers at build time only. No module from Shoalrun is loaded by the browser.
