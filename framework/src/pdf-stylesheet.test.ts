import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePrintStylesheet } from './pdf-stylesheet.js';

test('print CSS refuses URL-bearing and unknown functions, including nested and deferred values', () => {
  for (const css of [
    'body{background: image-set("https://example.invalid/pixel" 1x)}',
    'body{background: -WEBKIT-IMAGE-SET("/pixel" 1x)}',
    ':root{--background: image-set("/pixel" 1x)}body{background:var(--background)}',
    'body{background:cross-fade(linear-gradient(red,blue),image("/pixel"),50%)}',
    'body{background:src("/pixel")}',
    '@font-face{font-family:Test;src:local("Host font")}',
    'body{background:URL("/pixel")}',
    'body{background:u\\72l("/pixel")}',
    'body{background:future-loader("/pixel")}',
    '@import "/theme.css";',
    '/* incomplete',
    'p{content:"incomplete}',
    'p{content:"bad\nstring"}'
  ]) assert.throws(() => validatePrintStylesheet(css), /PDF stylesheet must not/);
});

test('print CSS retains layout, color, generated text, selectors, and comments', () => {
  for (const css of [
    ':root{--accent:oklch(50% 0.1 120)}body{color:var(--accent);width:calc(100% - 2mm)}',
    'p{background:linear-gradient(90deg,rgb(0 0 0),color-mix(in srgb,red,blue))}',
    '@page{@bottom-center{content:"Page " counter(page) " of " counter(pages)}}',
    'p::before{content:"image-set( is text, not a loader"}',
    '/* image-set("/ignored") */ p{font-size:clamp(9pt,2vw,12pt)}',
    'table :is(th,td):not(.hidden){padding:2mm} p:nth-child(2n+1){opacity:.9}',
    '@supports(display:grid){div{grid-template-columns:repeat(2,minmax(0,1fr))}}'
  ]) assert.doesNotThrow(() => validatePrintStylesheet(css));
});
