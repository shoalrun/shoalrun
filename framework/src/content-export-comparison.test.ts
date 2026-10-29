import test from 'node:test';
import assert from 'node:assert/strict';
import { compareContentManifests } from './content-export-comparison.js';
import { validateExportTarget } from './content-export-config.js';

const publication = { channel: 'production', version: 'current', language: 'en' };
const page = { kind: 'page', documentId: 'guide.billing' };
const section = { kind: 'section', documentId: 'guide.billing', sectionId: 'refunds' };
const snippet = { kind: 'snippet', id: 'billing.refund-window' };
const manifest = (refs: object[], variant = publication) => ({ schemaVersion: 1, kind: 'shoalrun-content-export', publication: variant, review: { status: 'ok', apis: [] }, resources: refs.map(ref => ({ ref, publication: variant, title: 'Example' })) });

test('reference comparison reports a missing baseline without claiming removal coverage', () => {
  const result = compareContentManifests(undefined, manifest([page]));
  assert.equal(result.status, 'no-baseline');
  assert.deepEqual(result.removed, []);
  assert.equal(result.added.length, 1);
  assert.equal(result.diagnostics[0].code, 'no-reference-baseline');
});

test('typed references survive title, body and ordering changes but report removed resources', () => {
  const previous = manifest([page, section, snippet]);
  const same = manifest([snippet, page, section]);
  same.resources[0].title = 'Renamed';
  assert.deepEqual(compareContentManifests(previous, same), { status: 'compared', added: [], removed: [], diagnostics: [] });
  const changed = compareContentManifests(previous, manifest([page, { ...section, sectionId: 'refund-policy' }]));
  assert.deepEqual(changed.removed.map(entry => entry.ref), [section, snippet]);
  assert.equal(changed.added.length, 1);
  assert.equal(changed.diagnostics[0].code, 'removed-content-reference');
});

test('publication changes are removals and additions, not accidental identity matches', () => {
  const result = compareContentManifests(manifest([page]), manifest([page], { ...publication, language: 'fr' }));
  assert.equal(result.removed.length, 1);
  assert.equal(result.added.length, 1);
  assert.equal(result.removed[0].publication.language, 'en');
  assert.equal(result.added[0].publication.language, 'fr');
});

test('comparison rejects malformed, duplicate and unreviewed baselines', () => {
  for (const invalid of [null, {}, { ...manifest([page]), schemaVersion: 2 }, manifest([page, page]), manifest([{ ...page, secret: 'private' }]), { ...manifest([page]), review: { status: 'required' } }]) {
    assert.throws(() => compareContentManifests(invalid, manifest([page])), /manifest|reviewed export/);
  }
  const mismatched = manifest([page]);
  mismatched.resources[0].publication = { ...publication, language: 'fr' };
  assert.throws(() => compareContentManifests(mismatched, manifest([page])), /manifest/);
});

test('resource selection preserves named snippet bindings and rejects ambiguous input', () => {
  const instance = { ...snippet, snippetId: 'shared.refund-window', title: 'Refund window', summary: 'When refunds are available.', values: { days: 30, enabled: true, label: 'Refunds' } };
  assert.deepEqual(validateExportTarget({ resources: [page, section, instance] }).resources, [page, section, instance]);
  assert.deepEqual(validateExportTarget({ documents: ['guide.billing'] }).documents, ['guide.billing']);
  for (const invalid of [
    { documents: ['guide.billing'], resources: [page] }, { resources: [] }, { resources: [page, page] },
    { resources: [{ ...section, sectionId: '../private' }] }, { resources: [{ ...instance, values: { days: Infinity } }] },
    { resources: [{ ...instance, values: { days: { nested: true } } }] }, { resources: [{ ...instance, summary: '' }] },
    { resources: [{ ...instance, id: '__proto__' }] }, { resources: [{ ...page, sourceFile: '/private/source' }] },
  ]) assert.throws(() => validateExportTarget(invalid), /Export/);
});
