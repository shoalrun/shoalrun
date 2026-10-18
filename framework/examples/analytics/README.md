# Analytics adapters

`inspector.js` shows the latest 100 Shoalrun events in a local panel and in
`window.shoalrunDebugEvents`. Copy it beside your config and set
`analytics: { module: ./inspector.js }`. It uses memory only and sends no requests.
Use it for local previews.

## PostHog

Copy `posthog.js` beside your config. Replace the public project token and
ingestion host with values from PostHog's web setup screen; never use a personal
API key. Install and bundle from that directory:

```sh
npm install posthog-js
npm install --save-dev esbuild
npx esbuild posthog.js --bundle --format=esm --platform=browser --outfile=analytics.js
```

Set `analytics: { module: ./analytics.js }` and rebuild your site. Commit the
lockfile and rebundle after adapter or SDK changes. The SDK may load additional
resources; allow them in your content security policy.

The adapter uses these mappings:

| Source | PostHog destination |
| --- | --- |
| Shoalrun `page_view` | `$pageview`; automatic SDK page views are disabled to avoid duplicates. |
| SDK page exit | `$pageleave`, with native scroll depth and duration. |
| Other Shoalrun and custom events | Original names, for Product Analytics insights and funnels. |

Do not rename interactions to `$autocapture`; it requires SDK-generated element
metadata. Generic click capture, heatmaps, replay, and person profiles are off.
PostHog adds its own properties and manages storage. Consent changes must also
update SDK capture: disabling Shoalrun alone does not stop native page leaves.

Serve your built site locally and filter PostHog's live event stream by
`environment = development`, including internal/test users. Check one `$pageview`
and a content interaction such as `code_copy`. Scroll, then follow a page link to
inspect `$pageleave`. Its `$prev_pageview_max_scroll_percentage` and
`$prev_pageview_max_content_percentage` range from 0 to 1;
`$prev_pageview_duration` is seconds open. These measure the document, excluding
nested code panes. Page-leave delivery is best effort.

If events are missing, check consent, blockers, and network requests. The local
inspector only shows Shoalrun events before translation; it cannot confirm
PostHog ingestion or show SDK-generated page leaves. Exclude development traffic
from production reports, or use a separate project.

Agents that fetch Markdown or call tools without running page JavaScript are
not counted. Measure those requests at the CDN, host, or tool server, including
cache hits. Keep request counts separate from browser page views. See the site's
analytics reference for the adapter contract and request-collection guidance.

See PostHog's [JavaScript SDK](https://posthog.com/docs/libraries/js) and
[configuration reference](https://posthog.com/docs/libraries/js/config).
