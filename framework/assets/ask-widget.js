// The chat panel: a floating "Ask" button and a dialog. `shoalrun serve --ask` injects it as a local preview that shows how each answer was
// made. A hosted site (`shoalrun vercel build --chat`) injects it too and publishes `/__shoalrun/chat.json`. When that file exists the panel runs
// as the public chat: it checks the visitor with Turnstile, shows the recording notice and any wording the site set, and shows only the answer, its sources, and
// warnings. It builds every node with createElement and textContent, and never assigns markup, so text from a model cannot inject HTML.
(async () => {
  if (window.__shoalrunAsk) return;
  window.__shoalrunAsk = true;
  const scriptUrl = document.currentScript.src;
  const endpoint = new URL('ask', scriptUrl).pathname;
  // Public settings for a hosted chat: the Turnstile site key and the notice. A local preview has none.
  const hosted = await fetch(new URL('chat.json', scriptUrl).pathname, { headers: { Accept: 'application/json' } }).then(response => response.ok ? response.json() : undefined).catch(() => undefined);
  // The wording a site may change (chat.panel). A hosted chat gets it in chat.json and a local preview in window.__shoalrunPanel. Any it leaves out keeps the text below.
  const words = { title: 'Ask the docs', placeholder: 'Ask about these docs', intro: 'Ask a question about these docs.', ...(hosted ? hosted.panel : window.__shoalrunPanel) };
  const maxHistory = 6;
  // Only the start of a long answer goes back as context, which keeps a follow-up request small.
  const clip = text => text.length > 1500 ? `${text.slice(0, 1500)}…` : text;

  const css = `
.sr-ask-button{position:fixed;right:16px;bottom:16px;z-index:2147483000;padding:10px 16px;border:1px solid var(--color-accent,#2563eb);border-radius:999px;background:var(--color-accent,#2563eb);color:var(--color-accent-contrast,#fff);font:600 14px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25)}
.sr-ask-button:focus-visible,.sr-ask-panel button:focus-visible,.sr-ask-panel input:focus-visible,.sr-ask-panel a:focus-visible{outline:3px solid var(--color-accent,#2563eb);outline-offset:2px}
.sr-ask-panel{position:fixed;right:16px;bottom:64px;z-index:2147483000;display:flex;flex-direction:column;width:min(440px,calc(100vw - 32px));max-height:min(640px,calc(100vh - 96px));border:1px solid var(--color-border,#cbd5e1);border-radius:var(--radius-panel,12px);background:var(--color-surface,#fff);color:var(--color-ink,#0f172a);font:14px/1.5 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.28)}
.sr-ask-panel[hidden]{display:none}
.sr-ask-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--color-border,#cbd5e1)}
.sr-ask-head strong{flex:1}
.sr-ask-tag{padding:1px 6px;border:1px solid var(--color-border,#cbd5e1);border-radius:4px;color:var(--color-muted,#475569);font-size:11px}
.sr-ask-panel button.sr-ask-plain{padding:4px 8px;border:1px solid var(--color-border,#cbd5e1);border-radius:6px;background:transparent;color:inherit;font:inherit;cursor:pointer}
.sr-ask-log{flex:1;overflow:auto;padding:12px}
.sr-ask-empty{color:var(--color-muted,#475569)}
.sr-ask-msg{margin:0 0 14px}
.sr-ask-you{padding:8px 10px;border-radius:8px;background:var(--color-field-surface,#f1f5f9);font-weight:600}
.sr-ask-msg p,.sr-ask-msg ul,.sr-ask-msg ol,.sr-ask-msg blockquote{margin:8px 0}
.sr-ask-msg ol{padding-left:1.6em;list-style-type:decimal}
.sr-ask-msg h2,.sr-ask-msg h3,.sr-ask-msg h4{margin:12px 0 4px;font-size:1.05em}
.sr-ask-msg blockquote{padding-left:10px;border-left:3px solid var(--color-border,#cbd5e1)}
.sr-ask-msg table{display:block;max-width:100%;overflow:auto;border-collapse:collapse;margin:8px 0}
.sr-ask-msg th,.sr-ask-msg td{padding:4px 6px;border:1px solid var(--color-border,#cbd5e1);text-align:left}
.sr-ask-msg pre{margin:8px 0;padding:8px 10px;overflow:auto;border-radius:6px;background:var(--color-field-surface,#f1f5f9);font:12px/1.5 var(--font-code,ui-monospace,monospace);white-space:pre}
.sr-ask-msg code{font-family:var(--font-code,ui-monospace,monospace);font-size:.92em}
.sr-ask-msg a{color:var(--color-accent,#2563eb)}
.sr-ask-msg .sr-cite{margin:0 1px;font-size:.8em;vertical-align:super;text-decoration:none}
.sr-ask-sources{margin:8px 0 0;padding:0;list-style:none;font-size:13px}
.sr-ask-sources li{margin:2px 0}
.sr-ask-meta{margin-top:8px;color:var(--color-muted,#475569);font-size:12px}
.sr-ask-meta summary{cursor:pointer}
.sr-ask-warn{margin-top:6px;padding:6px 8px;border-left:3px solid #b45309;background:var(--color-field-surface,#f1f5f9);font-size:12px}
.sr-ask-error{color:#b91c1c}
.sr-ask-form{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--color-border,#cbd5e1)}
.sr-ask-form input{flex:1;min-width:0;padding:8px 10px;border:1px solid var(--color-field-border,#94a3b8);border-radius:6px;background:var(--color-field-surface,#fff);color:inherit;font:inherit}
.sr-ask-form button{padding:8px 14px;border:1px solid var(--color-accent,#2563eb);border-radius:6px;background:var(--color-accent,#2563eb);color:var(--color-accent-contrast,#fff);font:600 14px/1 system-ui,sans-serif;cursor:pointer}
.sr-ask-form button:disabled{opacity:.6;cursor:progress}
.sr-ask-notice{margin:0;padding:8px 12px 10px;border-top:1px solid var(--color-border,#cbd5e1);color:var(--color-muted,#475569);font-size:12px;line-height:1.45}
.sr-ask-notice p{margin:0 0 4px}
.sr-ask-challenge:empty{display:none}
.sr-ask-challenge{padding:0 12px 8px}
.sr-ask-wait{display:flex;align-items:center;gap:10px;margin:0 0 14px;color:var(--color-muted,#475569)}
.sr-ask-dots{display:inline-flex;gap:4px;flex:none}
.sr-ask-dots i{display:block;width:7px;height:7px;border-radius:50%;background:var(--color-accent,#2563eb);opacity:.55}
@media (prefers-reduced-motion:no-preference){.sr-ask-dots i{animation:sr-ask-dot 1.2s ease-in-out infinite}.sr-ask-dots i:nth-child(2){animation-delay:.15s}.sr-ask-dots i:nth-child(3){animation-delay:.3s}}
@keyframes sr-ask-dot{0%,80%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:scale(1.15)}}
@media (prefers-reduced-motion:no-preference){.sr-ask-panel{animation:sr-ask-in .12s ease-out}}
@keyframes sr-ask-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
`;

  const el = (tag, attributes = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
      if (value === undefined || value === false) continue;
      if (name === 'text') node.textContent = value;
      else node.setAttribute(name, value === true ? '' : value);
    }
    for (const child of children) node.append(child);
    return node;
  };

  // Only same-site paths become links. A source URL that is anything else is shown as plain text.
  const safeHref = url => typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : undefined;

  const inline = (parent, text, sources) => {
    for (const piece of text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^\s)]+\)|(?:\[\d+\])+)/)) {
      if (!piece) continue;
      if (piece.startsWith('`') && piece.endsWith('`') && piece.length > 2) parent.append(el('code', { text: piece.slice(1, -1) }));
      else if (piece.startsWith('**') && piece.endsWith('**') && piece.length > 4) parent.append(el('strong', { text: piece.slice(2, -2) }));
      else if (piece.startsWith('*') && piece.endsWith('*') && piece.length > 2) parent.append(el('em', { text: piece.slice(1, -1) }));
      else if (/^\[[^\]\n]+\]\([^\s)]+\)$/.test(piece)) {
        const match = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(piece);
        const href = safeHref(match[2]);
        parent.append(href ? el('a', { href, text: match[1] }) : document.createTextNode(match[1]));
      }
      else if (/^(?:\[\d+\])+$/.test(piece)) {
        for (const match of piece.matchAll(/\[(\d+)\]/g)) {
          const source = sources.find(item => item.number === Number(match[1]));
          const href = source && safeHref(source.url);
          parent.append(href ? el('a', { class: 'sr-cite', href, title: source.title, text: `[${match[1]}]` }) : document.createTextNode(`[${match[1]}]`));
        }
      } else parent.append(document.createTextNode(piece));
    }
  };

  // A refusal lists the closest pages as "- Title: /path". With `pages` set, a same-site path in such a line becomes a link.
  const listItem = (line, sources, pages) => {
    const item = el('li');
    const text = line.replace(/^\s*(\d+[.)]|[-*])\s+/, '');
    const page = pages && text.match(/^(.+?): (\/\S*)$/);
    if (page && safeHref(page[2])) item.append(el('a', { href: page[2], text: page[1] }));
    else inline(item, text, sources);
    return item;
  };

  const render = (parent, text, sources, pages) => {
    const lists = [];
    const indentOf = line => (line.match(/^[ \t]*/)?.[0] ?? '').replace(/\t/g, '    ').length;
    const appendBlock = (node, indent, code = false) => {
      const current = lists.at(-1);
      if (current?.item && (indent > current.indent || code && current.item.textContent.replace(/\[\d+\]/g, '').trim().endsWith(':'))) current.item.append(node);
      else { lists.length = 0; parent.append(node); }
    };
    for (const part of text.split(/((?:^[ \t]*)?```[\s\S]*?```)/m)) {
      if (!part.trim()) continue;
      if (part.trimStart().startsWith('```')) {
        const indent = indentOf(part);
        let code = part.replace(/^[ \t]*```[^\n]*\n?/, '').replace(/\n?[ \t]*```$/, '');
        if (indent) code = code.replace(new RegExp('^ {0,' + indent + '}', 'gm'), '');
        appendBlock(el('pre', {}, el('code', { text: code })), indent, true); continue;
      }
      for (const block of part.split(/\n{2,}/)) {
        const heading = /^(#{1,6})\s+(.+)$/.exec(block.trim());
        if (heading && !block.trim().includes('\n')) { const node = el(`h${Math.max(2, heading[1].length)}`); inline(node, heading[2], sources); appendBlock(node, indentOf(block)); continue; }
        if (/^>\s?/.test(block.trim())) { const quote = el('blockquote'); render(quote, block.replace(/^>\s?/gm, ''), sources, pages); appendBlock(quote, indentOf(block)); continue; }
        if (/^\|.+\|\s*\n\|?\s*:?-{3,}/.test(block.trim())) {
          const rows = block.trim().split('\n').map(line => line.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim()));
          const table = el('table');
          for (const [index, cells] of rows.entries()) { if (index === 1) continue; const row = el('tr'); for (const cell of cells) { const node = el(index === 0 ? 'th' : 'td'); inline(node, cell, sources); row.append(node); } table.append(row); }
          appendBlock(table, indentOf(block)); continue;
        }
        // A block can mix kinds, such as a sentence that introduces a list, so it is cut into runs of one kind each.
        const kind = line => /^\s*#{1,6}\s+/.test(line) ? 'heading' : /^\s*\d+[.)]\s+/.test(line) ? 'ol' : /^\s*[-*]\s+/.test(line) ? 'ul' : 'p';
        const runs = [];
        for (const line of block.split('\n').filter(line => line.trim())) {
          const type = kind(line);
          if (runs.length && runs.at(-1).type === type) runs.at(-1).lines.push(line);
          else runs.push({ type, lines: [line] });
        }
        for (const { type, lines } of runs) {
          if (type === 'heading') { for (const line of lines) { const match = /^\s*(#{1,6})\s+(.+)$/.exec(line); const heading = el(`h${Math.max(2, match[1].length)}`); inline(heading, match[2], sources); appendBlock(heading, indentOf(line)); } continue; }
          if (type === 'p') { const paragraph = el('p'); inline(paragraph, lines.join(' '), sources); appendBlock(paragraph, indentOf(lines[0])); continue; }
          for (const line of lines) {
            const indent = indentOf(line);
            while (lists.length && (lists.at(-1).indent > indent || lists.at(-1).indent === indent && lists.at(-1).type !== type)) lists.pop();
            let current = lists.at(-1);
            if (!current || current.indent < indent) {
              const start = type === 'ol' ? Number(line.match(/^\s*(\d+)[.)]/)[1]) : undefined;
              const list = el(type, start === undefined ? {} : { start: String(start) });
              (current?.item ?? parent).append(list);
              current = { type, indent, list, item: null }; lists.push(current);
            }
            current.item = listItem(line, sources, pages); current.list.append(current.item);
          }
        }
      }
    }
  };

  const style = el('style', { text: css });
  const button = el('button', { class: 'sr-ask-button', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'sr-ask-panel', text: 'Ask' });
  const log = el('div', { class: 'sr-ask-log', role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversation' });
  const input = el('input', { type: 'text', id: 'sr-ask-input', autocomplete: 'off', maxlength: '500', placeholder: words.placeholder, 'aria-label': 'Your question' });
  const send = el('button', { type: 'submit', text: 'Send' });
  const reset = el('button', { class: 'sr-ask-plain', type: 'button', text: 'New chat' });
  const close = el('button', { class: 'sr-ask-plain', type: 'button', 'aria-label': 'Close', text: 'Close' });
  const form = el('form', { class: 'sr-ask-form' }, input, send);
  // Turnstile draws here only when a visitor has to do something. Otherwise the box stays empty and hidden.
  const challengeBox = el('div', { class: 'sr-ask-challenge' });
  const notice = el('div', { class: 'sr-ask-notice' }, ...(hosted?.notice ? [el('p', { text: hosted.notice })] : []), el('p', { text: 'Answers are written by an AI from these docs and can be wrong. Check the pages they cite.' }));
  const panel = el('section', { class: 'sr-ask-panel', id: 'sr-ask-panel', role: 'dialog', 'aria-label': words.title, hidden: true }, el('div', { class: 'sr-ask-head' }, el('strong', { text: words.title }), el('span', { class: 'sr-ask-tag', text: hosted ? 'beta' : 'local preview' }), reset, close), log, ...(hosted ? [challengeBox] : []), form, ...(hosted ? [notice] : []));
  let history = [];
  let busy = false;

  const intro = () => { log.replaceChildren(el('p', { class: 'sr-ask-empty', text: words.intro })); };
  const open = value => {
    panel.hidden = !value;
    button.setAttribute('aria-expanded', String(value));
    // In adaptive mode nobody is checked until the server asks. Only `always` mode checks ahead of the first question.
    if (value) { input.focus(); if (hosted?.prewarm) warm(); } else button.focus();
  };

  const show = (question, data, failure) => {
    const message = el('div', { class: 'sr-ask-msg' });
    if (failure) message.append(el('p', { class: 'sr-ask-error', role: 'alert', text: failure }));
    else {
      render(message, data.answer, data.sources ?? [], data.decision === 'declined' || data.decision === 'search');
      // A search-only answer already lists its pages as links in the text, so a second list of them would repeat it.
      if (data.sources?.length && data.decision !== 'search') {
        const list = el('ul', { class: 'sr-ask-sources', 'aria-label': 'Sources' });
        for (const source of data.sources) {
          const href = safeHref(source.url);
          const label = `[${source.number}] ${source.title}${source.heading ? ` > ${source.heading}` : ''}`;
          list.append(el('li', {}, href ? el('a', { href, text: label }) : document.createTextNode(label)));
        }
        message.append(list);
      }
      for (const warning of [...(data.uncited ? ['This answer cites no source. Check it against the docs.'] : []), ...(data.unsupportedCode?.length ? [`Code that is not in the docs: ${data.unsupportedCode.join(' | ')}`] : []), ...((data.unsupportedClaims ?? []).map(claim => `Not supported by the docs it cites: ${claim.text}`))]) message.append(el('div', { class: 'sr-ask-warn', role: 'note', text: warning }));
      if (hosted && data.deletionReceipt) {
        const remove = el('button', { class: 'sr-ask-plain', type: 'button', text: 'Delete logged question' });
        const state = el('span', { role: 'status' });
        remove.addEventListener('click', async () => {
          remove.disabled = true;
          try {
            const response = await fetch(endpoint, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receipt: data.deletionReceipt }) });
            const reply = await response.json();
            state.textContent = response.ok ? (reply.deleted ? 'Logged question deleted.' : 'This logged question is no longer stored.') : 'Could not delete it. Try again.';
            if (!response.ok) remove.disabled = false;
          } catch { state.textContent = 'Could not delete it. Try again.'; remove.disabled = false; }
        });
        message.append(el('div', { class: 'sr-ask-meta' }, remove, state, el('details', {}, el('summary', { text: 'Deletion code for a later request' }), el('code', { text: data.deletionReceipt }))));
      }
      if (!hosted) {
      const facts = [data.mode, data.cached ? 'from the answer cache' : undefined, data.decision === 'excerpt' ? 'excerpt, no model used' : data.decision === 'search' ? 'search only, no model used' : data.decision, data.jevBest !== undefined ? `Jev ${data.jevBest.toFixed(2)}` : undefined, `${data.usage?.chatCalls ?? 0} model call${data.usage?.chatCalls === 1 ? '' : 's'}`, data.usage ? `${data.usage.promptTokens} in / ${data.usage.completionTokens} out tokens` : undefined, data.verified ? 'claims checked' : undefined, data.routing?.escalated ? `escalated to ${data.routing.escalated.to}` : data.routing?.failed?.length ? `answered by ${data.routing.answeredBy} after ${data.routing.failed.length} failed` : undefined, data.timings ? `${((data.timings.rewriteMs + data.timings.retrieveMs + data.timings.rerankMs + data.timings.answerMs + (data.timings.verifyMs ?? 0)) / 1000).toFixed(1)}s` : undefined].filter(Boolean).join(' · ');
      const details = el('details', { class: 'sr-ask-meta' }, el('summary', { text: 'How this answer was made' }), el('div', { text: facts }));
      if (data.standalone) details.append(el('div', { text: `Searched for: ${data.standalone}` }));
      for (const note of data.notes ?? []) details.append(el('div', { text: `Note: ${note}` }));
      message.append(details);
      }
    }
    log.append(message);
    log.scrollTop = log.scrollHeight;
  };

  // Turnstile. A token works once, so each question gets its own: the widget is reset and run again before every send.
  let loading;
  let widget;
  let waiter;
  const loadTurnstile = () => loading ??= new Promise((resolve, reject) => {
    if (window.turnstile) { resolve(window.turnstile); return; }
    const script = el('script', { src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', async: true, defer: true });
    script.addEventListener('load', () => resolve(window.turnstile));
    script.addEventListener('error', () => { loading = undefined; reject(new Error('The check could not load.')); });
    document.head.append(script);
  });
  const checkVisitor = async () => {
    const turnstile = await loadTurnstile();
    if (widget === undefined) widget = turnstile.render(challengeBox, { sitekey: hosted.siteKey, appearance: 'interaction-only', execution: 'execute', callback: token => waiter?.resolve(token), 'error-callback': () => waiter?.reject(new Error('The check did not pass.')) });
    else turnstile.reset(widget);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('The check timed out.')), 30000);
      waiter = { resolve: token => { clearTimeout(timer); resolve(token); }, reject: error => { clearTimeout(timer); reject(error); } };
      turnstile.execute(widget);
    });
  };

  // By default nobody is checked until the server asks. Then one check runs and the same question is sent again, and the server gives the browser a
  // short-lived pass, so follow-ups need no token. With `prewarm` set, the check runs in the background when the panel opens instead.
  let verified = false;
  let warmed;
  const warm = () => { if (hosted?.siteKey && !verified && !warmed) warmed = checkVisitor().then(token => ({ token, at: Date.now() }), () => undefined); };
  const takeToken = async () => {
    const ready = warmed && await warmed;
    warmed = undefined;
    // A token is good for a few minutes. An old one is not worth sending.
    return ready && Date.now() - ready.at < 240000 ? ready.token : checkVisitor();
  };

  const ask = async question => {
    busy = true; send.disabled = true; log.setAttribute('aria-busy', 'true');
    if (log.querySelector('.sr-ask-empty')) log.replaceChildren();
    log.append(el('div', { class: 'sr-ask-msg sr-ask-you', text: question }));
    // Shown while the server works. The dots are decoration and are hidden from screen readers, which hear the words instead. The words
    // change at most a few times, so a screen reader is not read a running commentary.
    const status = el('span', { text: hosted?.siteKey && hosted.prewarm ? 'Checking that you are a person…' : 'Looking through the docs…' });
    const waiting = el('div', { class: 'sr-ask-wait', role: 'status' }, el('span', { class: 'sr-ask-dots', 'aria-hidden': 'true' }, el('i'), el('i'), el('i')), status);
    let later = [];
    log.append(waiting);
    log.scrollTop = log.scrollHeight;
    try {
      const post = token => fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, history, ...(token ? { turnstileToken: token } : {}) }) });
      let token;
      if (hosted?.siteKey && hosted.prewarm && !verified) {
        try { token = await takeToken(); }
        catch { waiting.remove(); show(question, undefined, 'The check did not pass. Reload the page and try again.'); return; }
        status.textContent = 'Looking through the docs…';
      }
      const statusDelays = window.__shoalrunAskStatusDelays ?? [3000, 10000, 25000];
      later = [setTimeout(() => { status.textContent = 'Writing an answer…'; }, statusDelays[0]), setTimeout(() => { status.textContent = 'Still working. Longer answers can take a few seconds.'; }, statusDelays[1]), setTimeout(() => { status.textContent = 'Taking longer than usual. A second check may be running.'; }, statusDelays[2])];
      let response = await post(token);
      let data = await response.json().catch(() => ({}));
      if (response.status === 403 && data.challenge && hosted?.siteKey && !token) {
        // The pass expired or was refused. Check again and send the same question once more.
        verified = false;
        status.textContent = 'Checking that you are a person…';
        try { token = await checkVisitor(); }
        catch { waiting.remove(); show(question, undefined, 'The check did not pass. Reload the page and try again.'); return; }
        status.textContent = 'Looking through the docs…';
        response = await post(token);
        data = await response.json().catch(() => ({}));
      }
      if (response.ok && hosted?.siteKey) verified = true;
      waiting.remove();
      if (!response.ok) show(question, undefined, data.error ?? `The request failed (${response.status}).`);
      else { show(question, data); history = [...history, { role: 'user', content: question }, { role: 'assistant', content: clip(data.answer) }].slice(-maxHistory); }
    } catch {
      waiting.remove();
      show(question, undefined, hosted ? 'Could not reach the chat. Check your connection and try again.' : 'Could not reach the local server.');
    } finally { later.forEach(clearTimeout); busy = false; send.disabled = false; log.removeAttribute('aria-busy'); input.focus(); }
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question || busy) return;
    input.value = '';
    ask(question);
  });
  reset.addEventListener('click', () => { history = []; intro(); input.focus(); });
  close.addEventListener('click', () => open(false));
  button.addEventListener('click', () => open(panel.hidden));
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); open(false); } });

  intro();
  document.head.append(style);
  document.body.append(button, panel);
})();
