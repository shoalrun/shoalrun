// Progressive enhancement: the complete shared content remains independent of
// the browser module. Each root gets its own controls slot and failure boundary.
const styles = new Map();
function stylesheet(url) {
  if (!styles.has(url)) styles.set(url, new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = url;
    link.onload = resolve; link.onerror = () => reject(new Error(`Cannot load component stylesheet: ${url}`));
    document.head.append(link);
  }));
  return styles.get(url);
}
for (const root of document.querySelectorAll('[data-component-module]')) {
  const controls = root.querySelector(':scope > [data-component-controls]');
  const content = root.querySelector(':scope > [data-component-content]');
  void (async () => {
    try {
      const [module] = await Promise.all([
        import(root.dataset.componentModule),
        ...JSON.parse(root.dataset.componentStyles || '[]').map(stylesheet)
      ]);
      if (typeof module.enhance !== 'function') throw new Error('Browser component module must export enhance');
      await module.enhance({ root, controls, content, data: JSON.parse(root.dataset.componentData) });
      root.dataset.componentReady = 'true';
    } catch (error) {
      controls.hidden = true;
      content.hidden = false;
      root.dataset.componentReady = 'failed';
      console.error(`Cannot enhance ${root.dataset.shoalrunComponent}:`, error);
    }
  })();
}
