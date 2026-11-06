const htmlTags = new Set('a abbr article b blockquote br caption code col colgroup dd del div dl dt em figcaption figure header footer h1 h2 h3 h4 h5 h6 hr i img kbd li ol p pre progress s section small span strong sub sup table tbody td th thead time tr ul'.split(' '));
const mathTags = new Set('math semantics annotation mrow mi mn mo mtext mspace ms mfrac msqrt mroot mstyle merror mpadded mphantom mfenced menclose msub msup msubsup munder mover munderover mmultiscripts mprescripts none mtable mtr mtd mlabeledtr'.split(' '));
const svgTags = new Set('svg g defs marker path rect circle ellipse line polyline polygon text tspan title desc linearGradient radialGradient stop clipPath pattern symbol use'.toLowerCase().split(' '));
const attributes = new Set('id class alt title colspan rowspan start reversed value max datetime scope align role aria-label aria-labelledby aria-describedby aria-hidden data-document-type'.split(' '));
const mathAttributes = new Set('xmlns display mathvariant encoding stretchy fence separator accent accentunder form lspace rspace minsize maxsize symmetric largeop movablelimits scriptlevel displaystyle linethickness notation columnalign columnspacing rowalign rowspacing columnspan rowspan width height depth voffset'.split(' '));
const svgAttributes = new Set('viewbox width height x y x1 y1 x2 y2 cx cy r rx ry d points fill stroke stroke-width stroke-linecap stroke-linejoin opacity fill-opacity stroke-opacity transform preserveaspectratio marker-start marker-mid marker-end offset stop-color stop-opacity clip-path fill-rule clip-rule'.split(' '));
const blocked = new Set('script style iframe object embed link base meta form select textarea audio video canvas noscript'.split(' '));
const browserOnly = new Set('doc-tablist reader-filter-slot reader-filter-controls reader-outside-view heading-anchor code-copy copy-status file-tree-controls doc-image-expand hero-actions example-picker api-view-control code-samples-bar'.split(' '));
const referrerPolicies = new Set('no-referrer no-referrer-when-downgrade origin origin-when-cross-origin same-origin strict-origin strict-origin-when-cross-origin unsafe-url'.split(' '));

export function printUrl(value, base, image = false) {
  try {
    const url = new URL(value, base);
    if (url.username || url.password || !['http:', 'https:', ...(image ? [] : ['mailto:', 'tel:'])].includes(url.protocol)) return undefined;
    const current = new URL(base);
    if (!image && url.origin === current.origin && url.pathname.replace(/\/$/, '') === current.pathname.replace(/\/$/, '') && url.hash) return url.hash;
    return url.href;
  } catch { return undefined; }
}

export function printPolicy(base) {
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Print view requires a website origin');
  // about:blank inherits access to its creator, but Firefox can resolve CSP 'self'
  // against the blank document. Grant assets only to the explicit website origin.
  return `default-src 'none'; img-src ${url.origin} https:; font-src ${url.origin}; style-src ${url.origin} 'unsafe-inline'; script-src 'none'; base-uri 'none'; form-action 'none'`;
}

/** Copy semantic content, not the website's controls or executable DOM. */
export function printNodes(node, base) {
  if (node.nodeType === 3) return [{ text: node.textContent ?? '' }];
  if (node.nodeType !== 1) return [];
  const tag = node.localName.toLowerCase();
  const classes = (node.getAttribute('class') ?? '').split(/\s+/);
  if (blocked.has(tag) || classes.some(name => browserOnly.has(name))) return [];
  if (tag === 'button') return [];
  if (tag === 'input') return node.getAttribute('type') === 'checkbox' ? [{ tag: 'span', attrs: {}, children: [{ text: node.hasAttribute('checked') ? '☑ ' : '☐ ' }] }] : [];
  const namespace = node.namespaceURI;
  const math = namespace === 'http://www.w3.org/1998/Math/MathML';
  const svg = namespace === 'http://www.w3.org/2000/svg';
  let children = [...node.childNodes].flatMap(child => printNodes(child, base));
  if (tag === 'details' || tag === 'summary') return [{ tag: tag === 'details' ? 'section' : 'h3', attrs: {}, children }];
  if (!(math ? mathTags : svg ? svgTags : htmlTags).has(tag)) return children;
  const attrs = {};
  for (const attribute of [...node.attributes]) {
    const name = attribute.name.toLowerCase(), value = attribute.value;
    if (/^on/.test(name) || ['hidden', 'aria-hidden', 'srcset', 'tabindex', 'contenteditable'].includes(name)) continue;
    if (name === 'href' || name === 'xlink:href') {
      if (svg) { if (/^#[A-Za-z0-9_.:-]+$/.test(value)) attrs.href = value; }
      else { const url = printUrl(value, base); if (url) attrs.href = url; }
    } else if (name === 'src' && tag === 'img') {
      const url = printUrl(node.currentSrc || value, base, true);
      if (url) attrs.src = url;
    } else if (name === 'crossorigin' && tag === 'img') {
      // Empty and invalid CORS attribute values both mean anonymous in HTML.
      attrs.crossorigin = value.toLowerCase() === 'use-credentials' ? 'use-credentials' : 'anonymous';
    } else if (name === 'referrerpolicy' && tag === 'img') {
      const policy = value.toLowerCase();
      if (referrerPolicies.has(policy)) attrs.referrerpolicy = policy;
    } else if (name === 'style') {
      // Site-theme code tokens remain readable through the print theme's variables.
      if (/^(?:color\s*:\s*(?:#[0-9a-f]{3,8}|var\(--code-(?:foreground|token-[a-z-]+)\));?\s*)+$/i.test(value)) attrs.style = value;
    } else if (attributes.has(name) || math && mathAttributes.has(name)) attrs[name] = value;
    // CSS escapes can hide url() and its protocol; retain only literal SVG values.
    else if (svg && svgAttributes.has(name) && !/[\\\u0000-\u001f]|javascript:|https?:|data:|url\((?!\s*#)/i.test(value)) attrs[attribute.name] = value;
  }
  if (tag === 'img') {
    if (!attrs.src) return [{ tag: 'p', attrs: {}, children: [{ text: attrs.alt ? `Image: ${attrs.alt}` : 'Image unavailable for printing.' }] }];
    attrs.loading = 'eager';
  }
  if (tag === 'a' && attrs.href && !attrs.href.startsWith('#')) { attrs.target = '_blank'; attrs.rel = 'noopener noreferrer'; }
  const label = node.getAttribute('data-reader-print-label');
  if (label) children = [{ tag: 'p', attrs: { class: 'pdf-reader-label' }, children: [{ text: label }] }, ...children];
  return [{ tag: node.localName, ...(math || svg ? { namespace } : {}), attrs, children }];
}

export function materialize(doc, node) {
  if (node.text !== undefined) return doc.createTextNode(node.text);
  const result = node.namespace ? doc.createElementNS(node.namespace, node.tag) : doc.createElement(node.tag);
  // Setting src can start a request immediately, even on a detached image.
  for (const [name, value] of Object.entries(node.attrs)) if (name !== 'src') result.setAttribute(name, value);
  if (node.attrs.src !== undefined) result.setAttribute('src', node.attrs.src);
  for (const child of node.children) result.append(materialize(doc, child));
  return result;
}
function element(doc, tag, text, className) {
  const result = doc.createElement(tag);
  if (text !== undefined) result.textContent = text;
  if (className) result.className = className;
  return result;
}
function marginContent(value, title) {
  return value.split(/(\{title\}|\{page\}|\{pages\})/).filter(Boolean).map(part => part === '{page}' ? 'counter(page)' : part === '{pages}' ? 'counter(pages)' : JSON.stringify(part === '{title}' ? title : part)).join(' ');
}

export async function populatePrintView(view, source, metadata, settings, signal) {
  if (view.closed || signal?.aborted) throw new Error('Print view was closed or cancelled');
  const doc = view.document;
  view.opener = null;
  doc.documentElement.lang = metadata.publication?.language ?? source.documentElement.lang ?? 'en';
  doc.head.replaceChildren();
  doc.title = metadata.title;
  const charset = element(doc, 'meta'); charset.setAttribute('charset', 'utf-8'); doc.head.append(charset);
  const policy = element(doc, 'meta'); policy.setAttribute('http-equiv', 'Content-Security-Policy');
  policy.setAttribute('content', printPolicy(source.location.href));
  doc.head.append(policy);
  const stylesheet = element(doc, 'link'); stylesheet.rel = 'stylesheet'; stylesheet.href = new URL(settings.stylesheet, source.location.href).href;
  if (new URL(stylesheet.href).origin !== source.location.origin) throw new Error('Print theme must be local');
  const styleReady = new Promise((resolve, reject) => { stylesheet.onload = resolve; stylesheet.onerror = () => reject(new Error('Print theme could not load')); });
  doc.head.append(stylesheet);
  const margins = element(doc, 'style');
  margins.textContent = `@page{${settings.header ? `@top-center{content:${marginContent(settings.header, metadata.title)};font:9px Arial,sans-serif;color:#555}` : ''}${settings.footer ? `@bottom-center{content:${marginContent(settings.footer, metadata.title)};font:9px Arial,sans-serif;color:#555}` : ''}}`;
  doc.head.append(margins);
  const tools = element(doc, 'nav', undefined, 'pdf-print-tools'); tools.setAttribute('aria-label', 'Print controls');
  const print = element(doc, 'button', 'Print / Save as PDF'); print.type = 'button'; print.disabled = true;
  const close = element(doc, 'button', 'Close'); close.type = 'button'; close.addEventListener('click', () => view.close());
  const note = element(doc, 'span', 'Preparing document…', 'pdf-print-note'); note.setAttribute('role', 'status');
  tools.append(print, close, note);
  doc.body.replaceChildren(tools);
  const publication = Object.entries(metadata.publication ?? {}).filter(([, value]) => value !== undefined).map(([key, value]) => `${key}: ${value}`).join(' · ');
  if (settings.cover) {
    const cover = element(doc, 'section', undefined, 'pdf-cover');
    if (settings.logo) { const logo = element(doc, 'img', undefined, 'pdf-logo'); logo.src = new URL(settings.logo, source.location.href).href; logo.alt = ''; cover.append(logo); }
    cover.append(element(doc, 'h1', metadata.title));
    if (settings.subtitle) cover.append(element(doc, 'p', settings.subtitle, 'pdf-subtitle'));
    if (publication) cover.append(element(doc, 'p', publication, 'pdf-publication'));
    doc.body.append(cover);
  }
  const chapter = element(doc, 'article', undefined, 'pdf-chapter');
  const header = source.querySelector('main.content > .page-head');
  if (header) for (const node of printNodes(header, source.location.href)) chapter.append(materialize(doc, node));
  else chapter.append(element(doc, 'h1', metadata.title));
  if (publication && !settings.cover) (chapter.querySelector('.page-head') ?? chapter).append(element(doc, 'p', publication, 'pdf-page-meta'));
  const article = source.querySelector('main.content > article');
  if (!article) throw new Error('Page content is unavailable');
  for (const node of [...article.childNodes].flatMap(child => printNodes(child, source.location.href))) chapter.append(materialize(doc, node));
  for (const examples of source.querySelectorAll('.examples')) for (const node of printNodes(examples, source.location.href)) chapter.append(materialize(doc, node));
  if (settings.toc) {
    const toc = element(doc, 'nav', undefined, 'pdf-toc'); toc.setAttribute('aria-label', 'Contents'); toc.append(element(doc, 'h1', 'Contents'));
    const list = element(doc, 'ol');
    let index = 0;
    const usedIds = new Set([...chapter.querySelectorAll('[id]')].map(node => node.id));
    for (const heading of chapter.querySelectorAll('h2,h3')) {
      if (!heading.id) {
        let id; do { id = `pdf-section-${++index}`; } while (usedIds.has(id));
        heading.id = id; usedIds.add(id);
      }
      const item = element(doc, 'li'), link = element(doc, 'a', heading.textContent); link.setAttribute('href', `#${heading.id}`); item.append(link); list.append(item);
    }
    toc.append(list); doc.body.append(toc);
  }
  doc.body.append(chapter);
  await styleReady;
  await doc.fonts.ready;
  for (const font of settings.fonts ?? []) {
    const loaded = await doc.fonts.load(`${font.style ?? 'normal'} ${font.weight ?? 'normal'} 12px ${JSON.stringify(font.family)}`);
    if (!loaded.length) throw new Error('A print font could not load');
  }
  await Promise.all([...doc.images].map(image => image.complete ? (image.naturalWidth ? Promise.resolve() : Promise.reject(new Error('A print image could not load'))) : new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('A print image could not load')); })));
  if (view.closed || signal?.aborted) throw new Error('Print view was closed or cancelled');
  print.disabled = false; note.textContent = 'Choose Save as PDF in the print dialog.';
  const trigger = () => { if (!view.closed) { view.focus(); view.print(); } };
  print.addEventListener('click', trigger);
  return trigger;
}
