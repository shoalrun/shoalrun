const cookbookInstances = new Map();
for (const [chooserIndex, chooser] of [...document.querySelectorAll('[data-cookbook-chooser]')].entries()) {
  const controls = chooser.querySelector('.cookbook-chooser-controls');
  const status = chooser.querySelector('.cookbook-chooser-status');
  const result = chooser.querySelector('.cookbook-chooser-result');
  const actions = chooser.querySelector('.cookbook-path-actions');
  if (!controls || !status || !result || !actions) continue;
  let config;
  try { config = JSON.parse(chooser.getAttribute('data-cookbook-chooser')); }
  catch { continue; }
  const { options, mode, title } = config;
  if (!Array.isArray(options)) continue;
  const inputs = [...controls.querySelectorAll('input')];
  const instance = cookbookInstances.get(config.id) ?? 0;
  cookbookInstances.set(config.id, instance + 1);
  const parameter = `cookbook.${config.id}.${instance}`;
  for (const input of inputs) input.name = parameter;
  const cache = new Map();
  let revision = 0;
  let selected = [];
  const fetchText = (route, kind) => {
    const key = `${kind}:${route}`;
    if (!cache.has(key)) cache.set(key, fetch(route).then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    }).catch(error => { cache.delete(key); throw error; }));
    return cache.get(key);
  };
  const recipeArticle = async option => {
    const html = await fetchText(option.route, 'html');
    const page = new DOMParser().parseFromString(html, 'text/html');
    const article = page.querySelector('main[data-document-type="recipe"] > article');
    if (!article) throw new Error('Recipe content was not found');
    return article;
  };
  const restore = () => {
    const values = new URL(location.href).searchParams.get(parameter)?.split(',') ?? [];
    let chosen = false;
    for (const input of inputs) {
      input.checked = values.includes(input.value) && (mode !== 'single' || !chosen);
      chosen ||= input.checked;
    }
  };
  const share = actions.querySelector('.cookbook-share');
  const update = async (save = true) => {
    const current = ++revision;
    selected = options.filter(option => inputs.some(input => input.value === option.id && input.checked));
    const currentSelection = selected;
    const url = new URL(location.href);
    if (selected.length) url.searchParams.set(parameter, selected.map(option => option.id).join(','));
    else url.searchParams.delete(parameter);
    if (save) history.replaceState(null, '', url);
    share.href = url.href;
    result.replaceChildren();
    actions.hidden = true;
    if (!selected.length) {
      status.textContent = mode === 'single' ? 'Choose one recipe.' : 'Choose one or more recipes.';
      return;
    }
    status.textContent = 'Loading your path…';
    const articles = await Promise.allSettled(selected.map(recipeArticle));
    if (current !== revision) return;
    const path = document.createElement('div');
    path.className = 'cookbook-assembled-path';
    const heading = document.createElement('h2');
    heading.textContent = 'Your path';
    path.append(heading);
    for (const [index, option] of currentSelection.entries()) {
      const step = document.createElement('section');
      step.className = 'cookbook-assembled-recipe';
      const heading = document.createElement('h3');
      heading.textContent = `${index + 1}. ${option.title}`;
      step.append(heading);
      const source = document.createElement('p');
      const sourceLink = document.createElement('a');
      sourceLink.href = option.route;
      sourceLink.textContent = 'Open the full recipe';
      source.append(sourceLink);
      step.append(source);
      const article = articles[index];
      if (article.status === 'fulfilled') {
        const body = document.importNode(article.value, true);
        for (const oldHeading of body.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
          const level = Math.min(Number(oldHeading.tagName.slice(1)) + 2, 6);
          const newHeading = document.createElement(`h${level}`);
          for (const attribute of oldHeading.attributes) newHeading.setAttribute(attribute.name, attribute.value);
          newHeading.append(...oldHeading.childNodes);
          oldHeading.replaceWith(newHeading);
        }
        const idMap = new Map();
        for (const element of body.querySelectorAll('[id]')) {
          const oldId = element.id;
          const newId = `cookbook-${chooserIndex}-${option.id}-${oldId}`;
          idMap.set(oldId, newId);
          element.id = newId;
        }
        for (const element of body.querySelectorAll('[aria-labelledby],[aria-describedby],[aria-controls],[for]')) {
          for (const name of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'for']) {
            if (element.hasAttribute(name)) element.setAttribute(name, element.getAttribute(name).split(/\s+/).map(id => idMap.get(id) ?? id).join(' '));
          }
        }
        for (const element of body.querySelectorAll('[href],[src]')) {
          for (const name of ['href', 'src']) {
            const value = element.getAttribute(name);
            if (!value) continue;
            if (name === 'href' && value.startsWith('#')) {
              let id;
              try { id = decodeURIComponent(value.slice(1)); } catch { id = value.slice(1); }
              if (idMap.has(id)) { element.setAttribute(name, `#${idMap.get(id)}`); continue; }
            }
            element.setAttribute(name, new URL(value, new URL(option.route, location.href)).href);
          }
        }
        step.append(...body.childNodes);
      } else {
        const error = document.createElement('p');
        error.textContent = 'This recipe could not be loaded here. Open the full recipe to continue, or select it again to retry.';
        step.append(error);
      }
      path.append(step);
    }
    result.replaceChildren(path);
    document.dispatchEvent(new CustomEvent('shoalrun:content', { detail: { root: chooser } }));
    actions.hidden = false;
    const failed = articles.some(article => article.status === 'rejected');
    actions.querySelector('.cookbook-print').disabled = failed;
    status.textContent = failed ? 'Some instructions could not be loaded. Open the full recipe or try again.' : `${selected.length} ${selected.length === 1 ? 'recipe' : 'recipes'} in your path.`;
  };
  const download = actions.querySelector('.cookbook-download');
  download.addEventListener('click', async () => {
    const current = revision;
    const selection = [...selected];
    download.disabled = true;
    try {
      const pages = await Promise.all(selection.map(option => fetchText(option.markdownRoute, 'markdown')));
      if (current !== revision) return;
      // Preserve the complete authored Markdown, including fenced code. Each recipe retains its own heading.
      const markdown = pages.length === 1 ? pages[0] : `# ${title}\n\n${pages.map(page => page.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim()).join('\n\n---\n\n')}\n`;
      const objectUrl = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${config.id}-${selection.map(option => option.id).join('-')}.md`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      status.textContent = 'Your Markdown download is ready.';
    } catch {
      if (current === revision) status.textContent = 'Markdown could not be downloaded. Try again or open the full recipe.';
    } finally { download.disabled = false; }
  });
  actions.querySelector('.cookbook-print').addEventListener('click', () => {
    const sheet = document.createElement('div');
    sheet.className = 'cookbook-print-sheet';
    const heading = document.createElement('h1');
    heading.textContent = title;
    sheet.append(heading, result.cloneNode(true));
    for (const details of sheet.querySelectorAll('details')) details.open = true;
    document.body.append(sheet);
    document.body.classList.add('cookbook-printing');
    const cleanup = () => { sheet.remove(); document.body.classList.remove('cookbook-printing'); };
    window.addEventListener('afterprint', cleanup, { once: true });
    try { window.print(); } catch { cleanup(); }
  });
  for (const input of inputs) input.addEventListener('change', () => update());
  window.addEventListener('popstate', () => { restore(); update(false); });
  controls.hidden = false;
  restore();
  update(false);
}
