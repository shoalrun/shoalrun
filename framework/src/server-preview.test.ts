import assert from 'node:assert/strict';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { previewMarkup } from './server.js';

test('fresh preview pages disclose the last edition and escape rebuild failures', () => {
  const markup = previewMarkup('/help', { profile: 'customer<demo>.yaml', profileDigest: 'a'.repeat(64), buildId: 'b'.repeat(64), error: '<img src=x onerror=alert(1)>' });
  assert.match(markup, /Customer preview: customer&lt;demo&gt;\.yaml/);
  assert.match(markup, /edition a{12}, build b{12}/);
  assert.match(markup, /Build failed: &lt;img/);
  assert.match(markup, /Showing the last successful build/);
  assert.doesNotMatch(markup, /<img/);
});

test('preview reload retains Unicode routes and navigates removed customer pages', () => {
  const listeners = new Map<string, (event: { data: string }) => void>();
  const redirects: string[] = [];
  let reloads = 0;
  const status = { textContent: '' };
  const script = previewMarkup('/help').match(/<script>([\s\S]*)<\/script>/)![1];
  runInNewContext(script, {
    EventSource: class { addEventListener(name: string, callback: (event: { data: string }) => void) { listeners.set(name, callback); } },
    location: { pathname: '/help/caf%C3%A9/', reload: () => reloads++, assign: (url: string) => redirects.push(url) },
    document: { getElementById: () => status },
  });
  listeners.get('built')!({ data: JSON.stringify({ routes: ['/help/café'], home: '/help/start' }) });
  assert.equal(reloads, 1);
  assert.deepEqual(redirects, []);
  listeners.get('built')!({ data: JSON.stringify({ routes: ['/other/start'], home: '/other/start' }) });
  assert.deepEqual(redirects, ['/other/start']);
  listeners.get('failed')!({ data: JSON.stringify({ message: 'Unknown customer release' }) });
  assert.match(status.textContent, /Unknown customer release.*last successful build/);
});
