import assert from 'node:assert/strict';
import test from 'node:test';
import { appendHighlighted, highlight } from '../assets/search-highlight.js';

test('search highlights raw text without rewriting entities or earlier marks', () => {
  assert.equal(highlight('Tips & tricks', ['amp']), 'Tips &amp; tricks');
  assert.equal(highlight('Mark a page', ['mark', 'a']), '<mark>Mark</mark> <mark>a</mark> p<mark>a</mark>ge');
  assert.equal(highlight('<mark> & "tips"', ['mark', '&']), '&lt;<mark>mark</mark>&gt; <mark>&amp;</mark> &quot;tips&quot;');
  assert.equal(highlight('a+b and a.b', ['a+b', 'a.b']), '<mark>a+b</mark> and <mark>a.b</mark>');
});

test('search appends hostile result text as text nodes and marks', () => {
  const ownerDocument = {
    createTextNode: value => ({ kind: 'text', textContent: value }),
    createElement: name => ({ kind: name, textContent: '' })
  };
  const target = { ownerDocument, children: [], append(node) { this.children.push(node); } };
  appendHighlighted(target, '<img src=x onerror=alert(1)> & match', ['match']);
  assert.deepEqual(target.children, [
    { kind: 'text', textContent: '<img src=x onerror=alert(1)> & ' },
    { kind: 'mark', textContent: 'match' }
  ]);
});
