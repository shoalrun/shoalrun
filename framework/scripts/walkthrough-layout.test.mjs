import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';

test('walkthrough remains stable at the split breakpoint when split styling adds a border', async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.setContent(`<style>*{box-sizing:border-box}.walkthrough{width:720px}.walkthrough.is-split{border:1px solid;padding:16px;display:grid;grid-template-columns:1fr 1fr}.walkthrough.is-split .walkthrough-code{display:none}</style>
      <article><section class="walkthrough" data-walkthrough data-layout="scroll">
      <ol class="walkthrough-steps">
      <li class="walkthrough-step"><h3 class="walkthrough-step-title">First step</h3><p>Read the body.</p><div class="walkthrough-code"><pre><code>const first = 1;</code></pre></div></li>
      <li class="walkthrough-step"><h3 class="walkthrough-step-title">Second step</h3><p>Check the result.</p><div class="walkthrough-code"><pre><code>const second = 2;</code></pre></div></li>
      </ol></section></article>`);
    await page.evaluate(() => {
      window.layoutTransitions = [];
      new MutationObserver(records => {
        for (const record of records) if (record.attributeName === 'class') window.layoutTransitions.push(record.target.classList.contains('is-split'));
      }).observe(document.querySelector('.walkthrough'), { attributes: true, attributeFilter: ['class'] });
    });
    await page.addScriptTag({ content: await readFile(new URL('../assets/walkthrough.js', import.meta.url), 'utf8') });
    const settle = () => page.evaluate(async () => { for (let frame = 0; frame < 12; frame++) await new Promise(requestAnimationFrame); });
    await settle();
    assert.deepEqual(await page.evaluate(() => window.layoutTransitions), [true], 'border must not cause repeated layout flips');
    assert.equal(await page.$eval('.walkthrough-pane', el => el.hidden), false);
    await page.$eval('.walkthrough', el => { el.style.width = '719px'; });
    await settle();
    assert.equal(await page.$eval('.walkthrough', el => el.classList.contains('is-split')), false);
    assert.equal(await page.$eval('.walkthrough-code pre', el => el.getAttribute('tabindex')), null);
    await page.$eval('.walkthrough', el => { el.style.width = '720px'; });
    await settle();
    assert.deepEqual(await page.evaluate(() => window.layoutTransitions), [true, false, true]);
    await page.click('.walkthrough-step:nth-child(2)');
    assert.match(await page.$eval('.walkthrough-status', el => el.textContent), /Step 2 of 2/);
    assert.match(await page.$eval('.walkthrough-stage pre:not([hidden])', el => el.textContent), /second/);
  } finally { await browser.close(); }
});
