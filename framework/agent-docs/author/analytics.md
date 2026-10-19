---
id: guide.analytics
title: Bring your own analytics
summary: Send documentation interaction events to your analytics service through
  an optional browser adapter.
type: reference
area: quality
subarea: quality-analytics
canonical: /author/analytics
---

# Bring your own analytics

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Customize > Analytics

**Updated: 2026-10-19.**

Shoalrun sends documentation interactions to an analytics service through an **adapter**: a browser module you supply to initialize the service and deliver events. Analytics is off by default. Shoalrun includes no service SDK, storage, visitor identity, or delivery queue.

## Configure an adapter

Point `analytics.module` at a local `.js` or `.mjs` file:

```yaml title="docs.config.yaml"
analytics:
  module: ./analytics.js
```

Paths resolve relative to the declaring config file, including included files. The build copies the module to `/assets/analytics-adapter.js` without executing or bundling it. Supply a self-contained module or use browser-resolvable imports; relative imports resolve from the copied asset directory. The file becomes public browser code.

For example, if your page already initializes a client named `myAnalytics`, forward events to its `capture` method:

```js title="analytics.js"
export function track(event) {
  globalThis.myAnalytics.capture(event.name, event.properties);
}
```

Replace the client and method with your service’s API. Set `analytics: false`, or omit the setting, to exclude the runtime, adapter, and page context. Unknown settings, unsupported extensions, and missing files fail the build.

## Adapter exports and consent

Implement these exports in your browser module:

| Export          | Required | Contract                                                                                                              |
| --------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `track(event)`  | Yes      | Receive an event; may return a promise. The adapter owns delivery, batching, retries, and flushing before navigation. |
| `init(context)` | No       | Initialize the service or await consent; may return a promise. Events start after it resolves.                        |

The read-only context provides `page` properties, `setEnabled(boolean)`, and `track(name, properties, element?)`. Import or initialization failures disable analytics for the page. Thrown or rejected `track` calls are caught without interrupting controls or navigation; Shoalrun does not retry them.

Events are discarded while initialization is pending or delivery is disabled. After initialization, Shoalrun sends `page_view` if enabled. To delay collection, await consent in `init`, or call `setEnabled(false)` and enable delivery from your consent callback. In the latter case, call `track('page_view')` after enabling to count the current page.

You can also disable delivery through the public hook:

```js
globalThis.shoalrunAnalytics?.setEnabled(false);
```

Connect consent changes to your SDK too. Disabling Shoalrun does not stop SDK-generated events, unload the SDK, or revoke data already sent.

## Event format

Each event has `schemaVersion`, `name`, and `properties`. For example:

```json
{
  "schemaVersion": 1,
  "name": "content_tab_change",
  "properties": {
    "pageId": "guide.example",
    "pageUrl": "/example",
    "documentType": "reference",
    "channel": "production",
    "version": "current",
    "language": "en",
    "navigationSectionId": "docs",
    "componentId": "clients:tabs:1",
    "componentType": "tabs",
    "headingId": "clients",
    "tabIndex": 1,
    "tabId": "clients-2"
  }
}
```

Every event includes page identity and publication properties; `navigationSectionId` appears only for pages in a navigation tab. `pageUrl` is the published path without query or fragment. Custom properties cannot replace page identity.

Events associated with an element add component context. `componentId` uses `data-analytics-id`, then the element’s HTML ID, then its heading, kind, and position. Generated IDs can change when content moves. `componentType` is `tabs`, `walkthrough`, `disclosure`, `code`, or `control`; `headingId` identifies the preceding article heading when available.

## Built-in events

Use these events to measure browser interactions. Each includes the page properties above.

| Event                     | Additional properties                         | Trigger                                                                                                                                                                          |
| ------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page_view`               | None                                          | Once after adapter initialization, when delivery is enabled.                                                                                                                     |
| `navigation_click`        | `region`, `targetPath`, `external`            | A section, sidebar, outline, breadcrumb, related-reading, card, hero, footer, header, article, or Markdown-action link is activated.                                             |
| `content_tab_change`      | `tabIndex`, `tabId`                           | A different content tab is selected by click or keyboard. Initial selection and hash reveals are excluded.                                                                       |
| `disclosure_toggle`       | `open`                                        | A reader opens or closes a Collapsible or article InfoHint through its summary. Programmatic initialization is excluded.                                                         |
| `walkthrough_step_change` | `stepIndex`, `stepCount`, `layout`, `trigger` | A different walkthrough step becomes active through click, keyboard, or step scrolling. Initial selection and layout changes are excluded.                                       |
| `code_copy`               | `language`, optional `stepIndex`              | A code example or walkthrough pane is successfully written to the clipboard.                                                                                                     |
| `markdown_copy`           | None                                          | The full Markdown twin is successfully written to the clipboard.                                                                                                                 |
| `section_link_copy`       | `targetHeadingId`                             | A heading's link is successfully written to the clipboard.                                                                                                                       |
| `search_results`          | `queryLength`, `resultCount`, `status`        | A completed search settles for 300 ms. Status is `results`, `empty`, or `error`; the count is the displayed result count.                                                        |
| `search_result_click`     | `queryLength`, `resultIndex`, `targetPath`    | A search result is activated, including through the keyboard.                                                                                                                    |
| `reader_filter_change`    | `scope`, `filter_<facet>`, optional `inherit` | A site or page reader selection changes through the controls or reader-view API. Initialization does not emit it. Facet hyphens become underscores; values are choice-ID arrays. |

Indexes start at zero. Navigation regions are `sections`, `sidebar`, `toc`, `breadcrumbs`, `related`, `card`, `hero`, `footer`, `header`, `content`, and `formats`; only HTTP(S) links qualify. Target paths omit queries and fragments. Built-in payloads exclude raw search queries, copied text, article text, reader identifiers, and referrers. A service SDK may add its own properties.

Changing component attributes from a script does not necessarily emit an event. Browser page loads emit page views; back-forward cache restoration has no separate built-in event.

## Map events to your service

Your adapter translates Shoalrun events into the service’s names, properties, and SDK calls. Use these rules when choosing mappings:

- Use the service’s native page-view event or API for its standard traffic reports. Check required properties as well as the name.
- Choose one source for each measurement. Disable equivalent automatic SDK events when the adapter supplies them.
- Keep content interactions as custom events unless a native event matches their meaning and required properties.
- Preserve page and component IDs, publication context, and `schemaVersion`. Check the destination’s limits on names and values.
- Use the SDK’s separate APIs for identification, grouping, exceptions, or replay; renaming an interaction does not enable these features.

Document each source, destination, property conversion, and automatic SDK feature you enable. Shoalrun has no universal page-exit or scroll-depth event. Verify one page visit and one content interaction in the destination, check they are counted once, and confirm native events populate the intended dashboard.

## Custom interactions

Site scripts can emit events from existing controls. For example, this site’s table-of-contents toggle calls the hook after hiding the panel:

```js
globalThis.shoalrunAnalytics?.track(
  'toc_visibility_change',
  { visible: false },
  document.querySelector('.toc-visibility-toggle')
);
```

The arguments are the event name, properties, and optional element for component context. Page properties are added automatically. The optional chain skips the call when analytics is unconfigured.

This hook does not register MDX components: unknown components fail the build. Use the [supported components](https://www.shoalrun.com/author/components.md) or register a [trusted component plugin](https://www.shoalrun.com/author/components/custom.md) with shared HTML and Markdown content.

Event names start with a lowercase letter and contain at most 64 lowercase letters, digits, or underscores.

Custom properties have these limits:

- Names start with a letter and contain at most 64 letters, digits, or underscores. `constructor` and `prototype` are reserved.
- Each call accepts up to 32 properties.
- Values can be strings of up to 256 characters, finite numbers, booleans, or arrays of up to 32 such values.
- Objects, nulls, and unsupported values are omitted.

`track` returns `true` when the adapter is invoked, not when delivery succeeds. It returns `false` if disabled, pending, invalid, or synchronously failed. Asynchronous failures are caught. The hook’s `enabled` property reports readiness and delivery state.

## Inspect events locally

Copy `framework/examples/analytics/inspector.js` beside your config and set `analytics.module` to `./inspector.js`. Its **Local events** panel and `window.shoalrunDebugEvents` show the latest 100 events in memory without sending requests. Use it only in local previews.

The inspector shows Shoalrun events before translation, so confirm service delivery separately. It cannot show events generated by a provider SDK.

## PostHog example

This example sends native page views and page leaves to PostHog, with custom events for content interactions. The runnable adapter is `framework/examples/analytics/posthog.js`.

1. ### Install the SDK and bundler

   From your documentation project, install the browser SDK and a bundler:

   ```sh
   npm install posthog-js
   npm install --save-dev esbuild
   ```

2. ### Create the adapter

   Save this as `posthog.js` beside your config. Replace the public project token and ingestion host with values from PostHog’s web setup screen. Never use a personal API key in browser code.

   ```js title="posthog.js"
   import posthog from 'posthog-js';

   export function init({ page }) {
     posthog.init('phc_REPLACE_WITH_PUBLIC_PROJECT_TOKEN', {
       api_host: 'https://us.i.posthog.com', // Use your project's ingestion host.
       autocapture: false,
       capture_dead_clicks: false,
       capture_heatmaps: false,
       capture_performance: false,
       capture_exceptions: false,
       disable_surveys: true,
       capture_pageview: false,
       capture_pageleave: true,
       disable_scroll_properties: false,
       disable_session_recording: true,
       person_profiles: 'never',
     });
     // Super-properties persist across pages, including pages outside navigation tabs.
     if (!page.navigationSectionId) posthog.unregister('navigationSectionId');
     // These properties also accompany SDK-generated page-leave events.
     posthog.register({
       ...page,
       environment: ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname)
         ? 'development' : 'production',
     });
   }

   export function track(event) {
     posthog.capture(event.name === 'page_view' ? '$pageview' : event.name, {
       ...event.properties,
       shoalrunSchemaVersion: event.schemaVersion,
       environment: ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname)
         ? 'development' : 'production',
     });
   }
   ```

   The adapter maps `page_view` to `$pageview` and keeps other Shoalrun event names. Automatic page views are off to avoid duplicates. PostHog supplies `$pageleave` with scroll depth and duration. Generic click capture, replay, and person profiles are disabled.

   Use custom names in Product Analytics insights and funnels. Do not map them to `$autocapture`, which requires SDK-generated element metadata. PostHog adds properties and manages browser storage; review its [SDK configuration](https://posthog.com/docs/libraries/js/config) for consent and content security policy requirements.

3. ### Bundle and configure the module

   Bundle the adapter and SDK into the file Shoalrun will copy:

   ```sh
   npx esbuild posthog.js --bundle --format=esm --platform=browser --outfile=analytics.js
   ```

   Keep your dependency lockfile and rebundle after changing the adapter or SDK. Point your config at the output:

   ```yaml title="docs.config.yaml"
   analytics:
     module: ./analytics.js
   ```

   Build with your usual project command, or run the CLI from the same directory:

   ```sh
   shoalrun build docs.config.yaml dist
   ```

4. ### Verify events on localhost

   Serve the built site locally. In PostHog’s live event stream, filter by `environment = development` and include internal or test users. Open a page and look for one `$pageview`; switch a tab or copy code and check for `content_tab_change` or `code_copy`. Page views should also appear in **Web Analytics**.

   Scroll down, then follow a link to another page. Inspect the first page’s `$pageleave` properties:

   | Property                                | Meaning                                                               |
   | --------------------------------------- | --------------------------------------------------------------------- |
   | `$prev_pageview_max_scroll_percentage`  | Furthest scroll position, from `0` to `1`; `1` means the bottom.      |
   | `$prev_pageview_max_content_percentage` | Fraction of document height reached by the viewport, from `0` to `1`. |
   | `$prev_pageview_duration`               | Seconds the page was open.                                            |

   These measure the document, excluding scrolling within code panes. Time open does not prove active reading, and page-leave delivery is best effort. For visual scrollmaps, configure [PostHog heatmaps](https://posthog.com/docs/toolbar/heatmaps) separately; some engagement metrics require generic autocapture.

   If events are missing, check consent, browser blockers, and network requests. Exclude development traffic from production reports or use a separate development project.

## HTML, Markdown, and agents

Instrumentation runs only in the browser and leaves Markdown and discovery artifacts unchanged. Agents that fetch Markdown or call tools without running page JavaScript are not counted.

To measure those requests, collect CDN or hosting logs, add a server request hook, or enable the separate [MCP analytics adapter](https://www.shoalrun.com/publish/mcp-analytics.md). Include cache hits: origin logs alone miss responses served by a CDN. Shoalrun does not install a request collector.

Measure discovery indexes, Markdown pages and sections, negotiated responses, and tool calls. Record the actual response representation because HTML and Markdown can share a URL. Keep health checks, `HEAD`, failures, and cache revalidation separate from successful body responses.

Send a separate server event such as `documentation_request` with path, representation, status, cache status, page ID when known, and a request ID for deduplication. Keep these counts separate from browser page views. Avoid raw headers, IP addresses, query strings, and page bodies by default.

A user agent is a claimed identity, not a verified one. People can fetch Markdown, and agents can use ordinary browsers; classify representation and claimed client separately. Requests do not prove reading, comprehension, or citation. Correlating them into sessions requires an explicit client or integration identifier; timing and IP address are unreliable.

## Related reading

### Next steps

- [Measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) — Measure documentation tool calls separately from browser interactions.

### Reference while working

- [Site search](https://www.shoalrun.com/author/search.md) — Configure the search provider whose displayed outcomes analytics records.

- [Reader views](https://www.shoalrun.com/author/reader-views.md) — Define reader facets and understand their browser interactions.

- [Configuration reference](https://www.shoalrun.com/config.md) — Find the project-level analytics module setting.

### Related topics

- [Measure MCP tool usage](https://www.shoalrun.com/publish/mcp-analytics.md) — Collect browser interactions through the separate browser adapter.
