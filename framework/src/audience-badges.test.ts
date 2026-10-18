import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildHtmlPage, root, type Document } from './content.js';

function page(audiences?: string[], subjectLifecycle?: Document['frontmatter']['subjectLifecycle']): string {
  const document: Document = {
    file: 'guide.mdx', body: '', tree: root([]), route: '/guide', markdownRoute: '/guide.md',
    variant: { channel: 'production', version: 'current', language: 'en' },
    frontmatter: {
      id: 'guide.test', title: 'Test guide', type: 'guide', summary: 'A guide.', slug: '/guide',
      ...(audiences ? { audiences } : {}), ...(subjectLifecycle ? { subjectLifecycle } : {})
    }
  };
  return buildHtmlPage(document, document.tree, '/guide.md', 'Docs', []);
}

test('audience labels appear only when provided and remain separate from subjectLifecycle status', () => {
  assert.doesNotMatch(page(), /audience-labels/);
  const html = page(['developers', 'partners'], 'beta');
  assert.match(html, /role="group" aria-label="Intended audience"/);
  assert.match(html, /<span class="audience-badge">developers<\/span>/);
  assert.match(html, /<span class="audience-badge">partners<\/span>/);
  assert.match(html, /<span class="subject-lifecycle-badge subject-lifecycle-beta">Beta<\/span>/);
});

test('audience labels escape authored text', () => {
  const html = page(['<script>alert("x")</script>']);
  assert.match(html, /&lt;script>alert\(&quot;x&quot;\)&lt;\/script>/);
  assert.doesNotMatch(html, /<script>alert/);
});
