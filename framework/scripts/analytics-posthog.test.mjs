import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('PostHog adapter maps page views once and configures native scroll/page-leave measurements', async () => {
  const source = await readFile(new URL('../examples/analytics/posthog.js', import.meta.url), 'utf8');
  for (const hostname of ['localhost', '127.0.0.1', 'docs.example.com']) {
    const calls = [];
    const registered = {};
    const posthog = {
      init: (...args) => calls.push({ method: 'init', args }),
      register: properties => { Object.assign(registered, properties); calls.push({ method: 'register', args: [properties] }); },
      unregister: property => { delete registered[property]; },
      capture: (name, properties) => calls.push({ method: 'capture', args: [name, { ...registered, ...properties }] }),
    };
    const context = vm.createContext({ posthog, location: { hostname } });
    vm.runInContext(source.replace("import posthog from 'posthog-js';", '').replaceAll('export function', 'function'), context);
    const page = { pageId: 'guide.demo', pageUrl: '/demo', navigationSectionId: 'docs' };
    context.init({ page });
    const config = calls[0].args[1];
    assert.equal(config.capture_pageview, false, 'Shoalrun owns the single initial page view');
    assert.equal(config.capture_pageleave, true);
    assert.equal(config.disable_scroll_properties, false);
    assert.equal(config.autocapture, false);
    assert.equal(config.disable_session_recording, true);
    assert.equal(config.capture_heatmaps, false);
    assert.equal(calls[1].method, 'register');
    assert.equal(calls[1].args[0].pageId, page.pageId, 'native page leaves retain documentation context');
    const environment = hostname === 'docs.example.com' ? 'production' : 'development';
    assert.equal(calls[1].args[0].environment, environment);
    context.track({ schemaVersion: 1, name: 'page_view', properties: page });
    const customNames = ['navigation_click', 'content_tab_change', 'walkthrough_step_change', 'disclosure_toggle', 'code_copy', 'markdown_copy', 'section_link_copy', 'search_results', 'search_result_click', 'reader_filter_change', 'toc_visibility_change'];
    for (const name of customNames) context.track({ schemaVersion: 1, name, properties: { ...page, stepIndex: 2 } });
    const captures = calls.filter(call => call.method === 'capture');
    assert.deepEqual(captures.map(call => call.args[0]), ['$pageview', ...customNames]);
    assert.equal(captures[0].args[1].shoalrunSchemaVersion, 1);
    assert.equal(captures[1].args[1].stepIndex, 2);
    assert.equal(captures[1].args[1].environment, environment);
    context.init({ page: { pageId: 'landing', pageUrl: '/' } });
    assert.ok(!('navigationSectionId' in registered), 'pages outside tabs clear persisted section context for native page leaves');
    context.track({ schemaVersion: 1, name: 'page_view', properties: { pageId: 'landing', pageUrl: '/' } });
    assert.equal(calls.at(-1).args[1].pageId, 'landing');
    assert.ok(!('navigationSectionId' in calls.at(-1).args[1]), 'new page views do not inherit the previous navigation section');
  }
});
