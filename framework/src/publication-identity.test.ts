import assert from 'node:assert/strict';
import test from 'node:test';
import { documentKey, parsePublicationKey, publicationKey, samePublication } from './publication-identity.js';

test('publication identities retain legacy bytes and distinguish product releases', () => {
  const legacy = { channel: 'production', version: 'v1', language: 'en' };
  const alpha = { ...legacy, product: 'alpha' };
  const beta = { ...legacy, product: 'beta' };
  assert.equal(publicationKey(legacy), 'production|v1|en');
  assert.equal(documentKey('guide.start', legacy), 'guide.start|production|v1|en');
  assert.notEqual(documentKey('guide.start', alpha), documentKey('guide.start', beta));
  assert.notEqual(documentKey('guide.start', alpha), documentKey('guide.start', legacy));
  for (const value of [legacy, alpha, beta]) assert.deepEqual(parsePublicationKey(publicationKey(value)), value);
  assert.equal(samePublication(alpha, beta), false);
  assert.equal(samePublication(alpha, { ...alpha, version: 'v2' }), false);
  assert.equal(samePublication(alpha, { ...alpha }), true);
  assert.throws(() => parsePublicationKey('production|v1|en|'), /Invalid publication/);
});
