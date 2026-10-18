import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const timeoutMs = 15000;

function contentType(response) {
  return response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
}

function includesToken(value, token) {
  return (value ?? '').split(',').some(part => part.trim().toLowerCase() === token);
}

function hasMarkdownLink(value, markdownUrl) {
  return (value ?? '').split(/,(?=\s*<)/).some(part => {
    const [target, ...parameters] = part.trim().split(';').map(value => value.trim());
    return target === `<${markdownUrl}>` && parameters.some(value => /^rel="?alternate"?$/i.test(value)) && parameters.some(value => /^type="?text\/markdown"?$/i.test(value));
  });
}

function openGraph(body, property) {
  return body.match(new RegExp(`<meta\\s+property="og:${property}"\\s+content="([^"]*)"`, 'i'))?.[1];
}

function xmlValue(value) {
  return value.replace(/&(?:amp|lt|gt|quot|apos);/g, entity => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" })[entity]);
}

function xmlEntries(body, tag) {
  const entries = [...body.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'g'))];
  return entries.map(([, entry]) => ({ loc: xmlValue(entry.match(/<loc>([^<]*)<\/loc>/)?.[1] ?? ''), lastmod: entry.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1] }));
}

export async function checkDeployment(baseUrl, options = {}) {
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol) || !base.pathname.endsWith('/') || /\/\/|(?:^|\/)\.{1,2}(?:\/|$)|%|\\/.test(base.pathname) || base.search || base.hash) {
    throw new Error('Pass a site URL ending in /, such as https://docs.example.com/docs/');
  }
  const mount = base.pathname.replace(/\/$/, '');
  const publicRoute = route => mount && route !== mount && !route.startsWith(`${mount}/`) ? `${mount}${route}` : route;
  if (options.sourceCommit !== undefined && !/^(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/.test(options.sourceCommit)) {
    throw new Error('sourceCommit must be a full 40- or 64-character Git commit hash');
  }
  const fetcher = options.fetch ?? fetch;
  const failures = [];
  let checks = 0;
  const fail = (route, message) => failures.push(`${route}: ${message}`);
  async function request(route, accept, extra = {}) {
    checks++;
    try {
      const response = await fetcher(new URL(publicRoute(route), base), {
        headers: { ...(accept ? { Accept: accept } : {}), ...(extra.headers ?? {}) },
        ...(extra.method ? { method: extra.method } : {}),
        ...(extra.body ? { body: extra.body } : {}),
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs)
      });
      return { response, body: await response.text() };
    } catch (error) {
      fail(route, `request failed: ${error.message}`);
      return undefined;
    }
  }
  function expect(route, result, status, type) {
    if (!result) return false;
    if (result.response.status !== status) fail(route, `expected HTTP ${status}, got ${result.response.status}`);
    if (type && contentType(result.response) !== type) fail(route, `expected Content-Type ${type}, got ${result.response.headers.get('content-type') ?? 'none'}`);
    return result.response.status === status;
  }
  async function jsonResource(route) {
    const result = await request(route);
    if (!expect(route, result, 200, 'application/json')) return undefined;
    try { return JSON.parse(result.body); }
    catch { fail(route, 'response is not valid JSON'); return undefined; }
  }

  const manifest = await jsonResource('/documents.json');
  const headers = await jsonResource('/resource-headers.json');
  if (!manifest || !headers) return { checks, documents: 0, failures };
  if ((manifest.basePath ?? '') !== mount) fail('/documents.json', `basePath must be ${mount || 'empty'} for this site URL`);
  if (options.sourceCommit) {
    const info = await jsonResource('/build-info.json');
    const deployedCommit = typeof info?.sourceCommit === 'string' ? info.sourceCommit.toLowerCase() : 'none';
    if (deployedCommit !== options.sourceCommit.toLowerCase()) {
      fail('/build-info.json', `expected source commit ${options.sourceCommit.toLowerCase()}, got ${deployedCommit}`);
    }
  }
  if (!Array.isArray(manifest.documents)) {
    fail('/documents.json', 'documents must be an array');
    return { checks, documents: 0, failures };
  }

  const robots = await request('/robots.txt');
  if (expect('/robots.txt', robots, 200, 'text/plain')) {
    const expectedRobots = `User-agent: *\nAllow: ${mount || '/'}\n${manifest.sitemap ? `Sitemap: ${base.origin}${manifest.sitemap}\n` : ''}`;
    if (robots.body.replace(/\r\n/g, '\n').trim() !== expectedRobots.trim()) fail('/robots.txt', 'rules differ from the build; Googlebot may be blocked or the sitemap may be missing');
  }
  if (manifest.sitemap) {
    if (manifest.sitemap !== publicRoute('/sitemap.xml')) fail('/documents.json', `sitemap must be ${publicRoute('/sitemap.xml')}`);
    const first = await request(manifest.sitemap);
    const listed = [];
    if (expect(manifest.sitemap, first, 200, 'application/xml')) {
      let sitemapBodies = [{ route: manifest.sitemap, body: first.body }];
      if (first.body.includes('<sitemapindex')) {
        const children = xmlEntries(first.body, 'sitemap');
        if (!children.length || children.length > 50000) fail(manifest.sitemap, 'sitemap index has an invalid child count');
        if (new Set(children.map(item => item.loc)).size !== children.length) fail(manifest.sitemap, 'duplicate child sitemap');
        sitemapBodies = [];
        for (const child of children) {
          let route;
          try { const url = new URL(child.loc); if (url.origin === base.origin && new RegExp(`^${publicRoute('/sitemap-').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\d+\\.xml$`).test(url.pathname) && !url.search && !url.hash) route = url.pathname; }
          catch { /* Report below. */ }
          if (!route) { fail(manifest.sitemap, `invalid child sitemap ${child.loc}`); continue; }
          const result = await request(route);
          if (expect(route, result, 200, 'application/xml')) sitemapBodies.push({ route, body: result.body });
        }
      }
      for (const item of sitemapBodies) {
        if (!item.body.includes('<urlset') || item.body.includes('<sitemapindex')) { fail(item.route, 'child is not a URL sitemap'); continue; }
        const entries = xmlEntries(item.body, 'url');
        if (!entries.length || entries.length > 50000 || Buffer.byteLength(item.body) > 50 * 1024 * 1024) fail(item.route, 'sitemap exceeds limits or has no URLs');
        listed.push(...entries);
      }
    }
    const expected = new Map(manifest.documents.filter(item => item.indexable !== false).map(item => [new URL(item.url, base).href, item.updated]));
    // Accept the discovery index alongside canonical pages, including older builds that omit it.
    const discoveryUrl = new URL(publicRoute('/llms.txt'), base).href;
    if (listed.some(item => item.loc === discoveryUrl)) expected.set(discoveryUrl, undefined);
    if (new Set(listed.map(item => item.loc)).size !== listed.length) fail(manifest.sitemap, 'duplicate URL entries');
    for (const entry of listed) {
      if (!expected.has(entry.loc)) fail(manifest.sitemap, `unexpected URL ${entry.loc}`);
      else if (entry.lastmod !== expected.get(entry.loc)) fail(manifest.sitemap, `wrong lastmod for ${entry.loc}`);
    }
    for (const url of expected.keys()) if (!listed.some(item => item.loc === url)) fail(manifest.sitemap, `missing URL ${url}`);
  }

  if (options.chat) {
    const settings = await jsonResource('/__shoalrun/chat.json');
    if (settings && (typeof settings !== 'object' || Array.isArray(settings))) fail('/__shoalrun/chat.json', 'chat settings must be an object');
    const get = await request('/__shoalrun/ask');
    expect('/__shoalrun/ask GET', get, 405, 'application/json');
    const hostile = await request('/__shoalrun/ask', undefined, { method: 'POST', headers: { Origin: 'https://another-site.example', 'Content-Type': 'application/json' }, body: '{}' });
    expect('/__shoalrun/ask foreign origin', hostile, 403, 'application/json');
    const sameSite = await request('/__shoalrun/ask', undefined, { method: 'POST', headers: { Origin: base.origin, 'Content-Type': 'application/json' }, body: '{}' });
    if (options.chatPaused) {
      if (expect('/__shoalrun/ask paused', sameSite, 503, 'application/json')) {
        try { if (JSON.parse(sameSite.body).paused !== true) fail('/__shoalrun/ask paused', 'response must contain paused: true'); }
        catch { fail('/__shoalrun/ask paused', 'response is not valid JSON'); }
      }
    } else expect('/__shoalrun/ask invalid question', sameSite, 400, 'application/json');
    const searchGet = await request('/__shoalrun/search');
    expect('/__shoalrun/search GET', searchGet, 405, 'application/json');
    const searchHostile = await request('/__shoalrun/search', undefined, { method: 'POST', headers: { Origin: 'https://another-site.example', 'Content-Type': 'application/json' }, body: '{}' });
    expect('/__shoalrun/search foreign origin', searchHostile, 403, 'application/json');
    const searchInvalid = await request('/__shoalrun/search', undefined, { method: 'POST', headers: { Origin: base.origin, 'Content-Type': 'application/json' }, body: '{}' });
    expect('/__shoalrun/search invalid query', searchInvalid, 400, 'application/json');
  }

  const llms = await request('/llms.txt');
  if (expect('/llms.txt', llms, 200, 'text/plain') && !llms.body.includes(publicRoute('/documents.json'))) {
    fail('/llms.txt', 'missing documents.json discovery link');
  }
  if (headers[publicRoute('/.well-known/api-catalog')]) {
    const catalog = await request('/.well-known/api-catalog');
    const declared = headers[publicRoute('/.well-known/api-catalog')]['Content-Type']?.split(';', 1)[0].toLowerCase();
    if (expect('/.well-known/api-catalog', catalog, 200, declared) && !llms?.body.includes(publicRoute('/.well-known/api-catalog'))) {
      fail('/llms.txt', 'missing API catalog discovery link');
    }
    if (catalog?.response.ok) {
      try { JSON.parse(catalog.body); }
      catch { fail('/.well-known/api-catalog', 'response is not valid JSON'); }
    }
  }

  let shareImage;
  for (const document of manifest.documents) {
    const { url, markdownUrl } = document;
    if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//') || typeof markdownUrl !== 'string' || !markdownUrl.startsWith('/') || markdownUrl.startsWith('//')) {
      fail('/documents.json', 'document has invalid url or markdownUrl');
      continue;
    }
    const firstHtml = await request(url, 'text/html');
    const slashRoute = url.endsWith('/') ? url : `${url}/`;
    const slash = new URL(slashRoute, base).href;
    const html = firstHtml?.response.status === 301 && [slashRoute, slash].includes(firstHtml.response.headers.get('location')) ? await request(slashRoute, 'text/html') : firstHtml;
    const negotiated = await request(url, 'text/markdown');
    const direct = await request(markdownUrl, 'text/markdown');
    if (expect(url, html, 200, 'text/html')) {
      if ('indexable' in document || manifest.sitemap) {
        const canonical = html.body.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
        if ((canonical || manifest.sitemap) && canonical !== new URL(url, base).href) fail(url, `canonical points to ${canonical ?? 'none'}, not this page`);
        const noindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html.body) || /(?:^|[,\s])noindex(?:$|[,\s])/i.test(html.response.headers.get('x-robots-tag') ?? '');
        if (document.indexable === false && !noindex) fail(url, 'nonindexable page lacks noindex');
        if (document.indexable !== false && noindex) fail(url, 'sitemap candidate has noindex');
      }
      if (!includesToken(html.response.headers.get('vary'), 'accept')) fail(url, 'HTML response missing Vary: Accept');
      if (!hasMarkdownLink(html.response.headers.get('link'), markdownUrl)) fail(url, `HTML response missing alternate Link to ${markdownUrl}`);
      if (!/<html[\s>]/i.test(html.body)) fail(url, 'HTML response has no html element');
      const pageUrl = openGraph(html.body, 'url');
      if (pageUrl && pageUrl !== new URL(url, base).href) fail(url, `og:url points to ${pageUrl}, not this deployed origin`);
      const imageUrl = openGraph(html.body, 'image');
      if (imageUrl) {
        let image;
        try { image = new URL(imageUrl); }
        catch { fail(url, `og:image is not an absolute URL: ${imageUrl}`); }
        if (image && !['http:', 'https:'].includes(image.protocol)) fail(url, `og:image must use HTTP(S): ${imageUrl}`);
        else if (image && image.origin !== base.origin) fail(url, `og:image points to ${image.origin}, not this deployed origin`);
        else if (image && !shareImage) shareImage = image.pathname;
      }
    }
    if (expect(`${url} (Accept: text/markdown)`, negotiated, 200, 'text/markdown')) {
      if (!includesToken(negotiated.response.headers.get('vary'), 'accept')) fail(url, 'Markdown response missing Vary: Accept');
      if (negotiated.response.headers.get('content-location') !== markdownUrl) fail(url, `Markdown response missing Content-Location: ${markdownUrl}`);
      if (!hasMarkdownLink(negotiated.response.headers.get('link'), markdownUrl)) fail(url, `Markdown response missing alternate Link to ${markdownUrl}`);
    }
    if (expect(markdownUrl, direct, 200, 'text/markdown') && negotiated?.response.ok && direct.body !== negotiated.body) {
      fail(url, `negotiated Markdown differs from ${markdownUrl}`);
    }
    if (direct?.response.ok && !llms?.body.includes(markdownUrl)) fail('/llms.txt', `missing ${markdownUrl}`);
  }

  if (shareImage) {
    const image = await request(shareImage);
    if (expect(shareImage, image, 200) && !/^image\/(?:png|jpeg|webp|gif)$/.test(contentType(image.response) ?? '')) {
      fail(shareImage, `expected a social image Content-Type, got ${image.response.headers.get('content-type') ?? 'none'}`);
    }
  }

  const missing = `/.shoalrun-deployment-check-${randomUUID()}`;
  for (const accept of ['text/html', 'text/markdown']) {
    const result = await request(missing, accept);
    if (result?.response.status !== 404) fail(missing, `expected HTTP 404 for ${accept}, got ${result?.response.status ?? 'no response'}`);
  }
  return { checks, documents: manifest.documents.length, failures };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [baseUrl, ...extra] = process.argv.slice(2);
  const flags = new Set(extra);
  const sourceAt = extra.indexOf('--source-commit');
  const sourceCommit = sourceAt >= 0 ? extra[sourceAt + 1] : undefined;
  const allowed = extra.filter((item, index) => item === '--chat' || item === '--chat-paused' || (item === '--source-commit' && sourceCommit && index === sourceAt) || (index === sourceAt + 1 && sourceCommit));
  if (!baseUrl || allowed.length !== extra.length || flags.has('--chat-paused') && !flags.has('--chat') || sourceAt >= 0 && !sourceCommit) {
    console.error('Usage: node scripts/check-deployment.mjs <site-origin> [--source-commit <full-sha>] [--chat [--chat-paused]]');
    process.exitCode = 2;
  } else {
    try {
      const result = await checkDeployment(baseUrl, { sourceCommit, chat: flags.has('--chat'), chatPaused: flags.has('--chat-paused') });
      for (const failure of result.failures) console.error(`FAIL ${failure}`);
      console.log(`${result.failures.length ? 'FAIL' : 'PASS'}: ${result.checks} requests, ${result.documents} documents, ${result.failures.length} failures`);
      if (result.failures.length) process.exitCode = 1;
    } catch (error) {
      console.error(`FAIL: ${error.message}`);
      process.exitCode = 2;
    }
  }
}
