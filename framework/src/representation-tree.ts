import { createHash } from 'node:crypto';
import katex from 'katex';
import { badgeIcon, treeIcon } from './icons.js';
import { heading, link, list, markdownRoute, paragraph, text } from './content.js';
import { walkthroughHtml, walkthroughMarkdown } from './walkthrough.js';
import { procedureTree } from './procedure-components.js';
import { readerViewParam } from './reader-filters.js';
import { paletteCatalog, presetCatalog } from './palettes.js';
import { diagramSvg } from './diagram-svg.js';

export function publicTree(tree: any, representation: 'html' | 'markdown', documentRoutes: Set<string>, mode: 'light' | 'dark' | 'system' = 'light', basePath = ''): any {
  let diagramIndex = 0;
  const element = (name: string, properties: Record<string, unknown>, children: any[]) => ({ type: 'paragraph', data: { hName: name, hProperties: properties }, children });
  const walk = (node: any): any[] => {
    if (node.type === 'docComponent') {
      const children = node.children.flatMap(walk);
      if (representation === 'markdown') return children;
      return [element('section', { 'data-shoalrun-component': node.name, 'data-component-data': JSON.stringify(node.componentData), 'data-component-module': `${basePath}${node.browser.moduleUrl}`, 'data-component-styles': JSON.stringify(node.browser.styleUrls.map((url: string) => `${basePath}${url}`)) }, [
        element('div', { 'data-component-controls': '', hidden: true }, []),
        element('div', { 'data-component-content': '' }, children)
      ])];
    }
    if (node.type === 'docRepresentation') return node.representation === representation ? node.children.flatMap(walk) : [];
    if (node.type === 'docCookbookChooser') {
      const prompt = node.mode === 'single' ? 'Choose one recipe.' : 'Choose one or more recipes.';
      const details = (option: any) => [option.when ? `Use when: ${option.when}` : option.summary, option.needs ? `You need: ${option.needs}` : '', option.outcome ? `You will have: ${option.outcome}` : ''].filter(Boolean);
      if (representation === 'markdown') return [
        paragraph(text(`${node.title}. ${prompt}`)),
        list(node.options.map((option: any) => [paragraph(link(option.markdownRoute, `${option.label} — ${option.title}`)), ...details(option).map((value: string) => paragraph(text(value)))]))
      ];
      return [element('section', { className: ['cookbook-chooser'], 'data-cookbook-chooser': JSON.stringify({ options: node.options, id: node.id, mode: node.mode, title: node.title }) }, [
        element('div', { className: ['cookbook-chooser-controls'], hidden: true }, [
          element('fieldset', {}, [element('legend', {}, [text(node.title)]), ...node.options.map((option: any) => element('label', { className: ['cookbook-option'] }, [
            element('input', { type: node.mode === 'single' ? 'radio' : 'checkbox', value: option.id }, []),
            element('span', {}, [element('strong', {}, [text(option.label)]), ...details(option).map((value: string) => element('span', { className: ['cookbook-option-detail'] }, [text(value)]))])
          ]))]),
          element('p', { className: ['cookbook-chooser-status'], role: 'status', 'aria-live': 'polite' }, [text(prompt)]),
          element('div', { className: ['cookbook-path-actions'], hidden: true }, [
            element('a', { className: ['cookbook-share'], href: '#' }, [text('Link to this path')]),
            element('button', { type: 'button', className: ['cookbook-download'] }, [text('Download Markdown')]),
            element('button', { type: 'button', className: ['cookbook-print'] }, [text('Print this path')])
          ]),
          element('div', { className: ['cookbook-chooser-result'] }, [])
        ]),
        element('div', { className: ['cookbook-chooser-approved'] }, [
          element('p', {}, [text('Recipes in this cookbook:')]),
          element('ul', {}, node.options.map((option: any) => element('li', {}, [element('a', { href: option.route }, [text(`${option.label} — ${option.title}`)])])))
        ])
      ])];
    }
    if (node.type === 'docReaderSection') {
      const children = node.children.flatMap(walk);
      return representation === 'markdown' ? [paragraph({ type: 'strong', children: [text(`For ${node.description}.`)] }), ...children]
        : [element('section', { className: ['reader-section'], 'data-reader-filters': JSON.stringify(node.selection) }, children)];
    }
    if (node.type === 'docReaderChoice') {
      if (representation === 'markdown') {
        const choice = link(`${node.route}?${node.scope === 'page' ? 'pageView' : 'view'}=${encodeURIComponent(readerViewParam(node.selection))}`, node.label);
        choice.data = { htmlDestination: true };
        return [paragraph(choice)];
      }
      return [element('button', { type: 'button', className: ['reader-choice'], 'data-reader-choice': JSON.stringify(node.selection), 'data-reader-scope': node.scope }, [text(node.label)])];
    }
    if (node.type === 'docReaderFilter') {
      return representation === 'markdown' ? [] : [element('div', { className: ['reader-filter-slot'], 'data-reader-filter': JSON.stringify(node.control) }, [])];
    }
    if (node.type === 'docTable') {
      const table = node.children.flatMap(walk);
      if (representation === 'markdown') return table;
      const filter = node.filter ? element('div', { className: ['doc-table-filter'], hidden: true }, [
        element('label', {}, [text('Filter rows'), element('input', { type: 'search', placeholder: 'Search table rows' }, [])]),
        element('span', { className: ['doc-table-count'], role: 'status', 'aria-live': 'polite' }, [])
      ]) : null;
      return [element('div', { className: ['doc-table'], ...(node.filter ? { 'data-table-filter': '' } : {}) }, [
        ...(filter ? [filter] : []),
        element('div', { className: ['doc-table-scroll', ...(node.sticky ? ['doc-table-sticky'] : [])], ...(node.sticky ? { tabIndex: 0 } : {}) }, table)
      ])];
    }
    if (node.type === 'docBadge') {
      if (representation === 'markdown') return [text(node.label)];
      return [element('span', { className: ['doc-badge', `doc-badge-${node.variant}`] }, [...(node.icon ? [badgeIcon(node.icon)] : []), text(node.label)])];
    }
    if (node.type === 'docKbd') return representation === 'markdown' ? [text(node.label)] : [element('kbd', { className: ['doc-kbd'] }, [text(node.label)])];
    if (node.type === 'docInfoHint') {
      if (representation === 'markdown') return [paragraph(text(`${node.label}: ${node.definition}`))];
      return [element('details', { className: ['doc-info-hint'] }, [element('summary', {}, [text(node.label)]), element('p', {}, [text(node.definition)])])];
    }
    if (node.type === 'docTooltip') {
      if (representation === 'markdown') return [node.inline ? text(`${node.label} (${node.definition})`) : paragraph(text(`${node.label}: ${node.definition}`))];
      const tooltip = element('span', { className: ['doc-tooltip'], 'data-tooltip': '' }, [
        element('span', { className: ['doc-tooltip-trigger'] }, [text(node.label)]),
        element('span', { className: ['doc-tooltip-separator'] }, [text(': ')]),
        element('span', { className: ['doc-tooltip-popup'] }, [text(node.definition)])
      ]);
      return [node.inline ? tooltip : paragraph(tooltip)];
    }
    if (node.type === 'docProgress') {
      const summary = `${node.label}: ${node.value} of ${node.max} complete`;
      if (representation === 'markdown') return [paragraph(text(`${summary}.`))];
      return [element('div', { className: ['doc-progress'] }, [element('p', { className: ['doc-progress-label'] }, [text(summary)]), element('progress', { value: node.value, max: node.max, 'aria-label': node.label }, [text(`${node.value} of ${node.max}`)])])];
    }
    if (node.type === 'docMath') {
      if (representation === 'markdown') {
        const math = node.display ? { type: 'code', lang: 'latex', value: node.expression } : { type: 'inlineCode', value: node.expression };
        return [node.block && !node.display ? paragraph(math) : math];
      }
      const marker = `SHOALRUNMATH${createHash('sha256').update(`${node.display}|${node.expression}`).digest('hex').slice(0, 24)}`;
      const markup = katex.renderToString(node.expression, { output: 'mathml', displayMode: node.display, throwOnError: true, strict: 'error', trust: false, maxExpand: 1000 });
      const math = element(node.display ? 'div' : 'span', { className: [node.display ? 'doc-math-display' : 'doc-math-inline'] }, [{ type: 'text', value: marker, data: { mathMarkup: markup } }]);
      return [node.block && !node.display ? paragraph(math) : math];
    }
    if (node.type === 'docActionLink') {
      const children = node.children.flatMap(walk);
      const url = representation === 'markdown' && documentRoutes.has(node.url) ? markdownRoute(node.url, basePath) : node.url;
      return [{ type: 'link', url, children, ...(representation === 'html' ? { data: { hProperties: { className: ['doc-action-link', `doc-action-${node.variant}`] } } } : {}) }];
    }
    if (node.type === 'docDefinitionList') {
      if (representation === 'markdown') {
        const inline = new Set(['text', 'strong', 'emphasis', 'inlineCode', 'link', 'delete', 'image', 'break']);
        const blocks = (children: any[]) => {
          const result: any[] = [];
          let pending: any[] = [];
          const flush = () => { if (pending.length) result.push(paragraph(...pending)); pending = []; };
          for (const child of children) {
            if (inline.has(child.type)) pending.push(child);
            else { flush(); result.push(child); }
          }
          flush();
          return result;
        };
        return [{ type: 'list', ordered: false, spread: true, children: node.items.map((item: any) => ({ type: 'listItem', spread: true, children: [
          paragraph({ type: 'strong', children: item.term.flatMap(walk).flatMap((term: any) => term.type === 'paragraph' ? term.children : [term]) }),
          ...blocks(item.definition.flatMap(walk))
        ] })) }];
      }
      const list = element('dl', { className: ['doc-definition-list'] }, node.items.flatMap((item: any) => [
        element('dt', {}, item.term.flatMap(walk).flatMap((term: any) => term.type === 'paragraph' ? term.children : [term])),
        element('dd', {}, item.definition.flatMap(walk))
      ]));
      if (!node.filter) return [list];
      const controls = element('div', { className: ['doc-definition-filter'], hidden: true }, [
        element('label', {}, [text('Filter terms and definitions'), element('input', { type: 'search', placeholder: 'Search glossary' }, [])]),
        element('span', { className: ['doc-definition-count'], role: 'status', 'aria-live': 'polite' }, [])
      ]);
      return [element('div', { className: ['doc-definition-list-wrap'], 'data-definition-filter': '' }, [controls, list])];
    }
    if (node.type === 'docFileTree') {
      const item = (entry: any): any => {
        const url = entry.url && representation === 'markdown' && documentRoutes.has(entry.url) ? markdownRoute(entry.url, basePath) : entry.url;
        const label = url ? link(url, entry.name) : text(entry.name);
        const children = entry.children.map(item);
        if (representation === 'markdown') return { type: 'listItem', spread: !!children.length, children: [paragraph(label), ...(children.length ? [{ type: 'list', ordered: false, children }] : [])] };
        const icons = entry.kind === 'folder' && (!entry.icon || entry.icon === 'folder')
          ? [element('span', { className: ['tree-folder-closed'] }, [treeIcon('folder')]), element('span', { className: ['tree-folder-open'] }, [treeIcon('folder-open')])]
          : [treeIcon(entry.icon || 'file')];
        const caption = element('span', { className: ['file-tree-label'] }, [
          ...icons,
          ...(url ? [{ type: 'link', url, children: [text(entry.name)] }] : [text(entry.name)])
        ]);
        return element('li', { className: [entry.kind === 'folder' ? 'file-tree-folder' : 'file-tree-file'] }, entry.kind === 'folder' ? [element('details', { className: ['file-tree-branch'], ...(!entry.collapsed ? { open: true } : {}) }, [element('summary', {}, [caption]), ...(children.length ? [element('ul', {}, children)] : [])])] : [caption]);
      };
      const items = node.items.map(item);
      return representation === 'markdown' ? [{ type: 'list', ordered: false, children: items }] : [element('div', { className: ['doc-file-tree'], 'data-file-tree': '' }, [...(node.controls ? [element('div', { className: ['file-tree-controls'], hidden: true }, [element('button', { type: 'button', 'data-tree-expand': '' }, [text('Expand all')]), element('button', { type: 'button', 'data-tree-collapse': '' }, [text('Collapse all')])])] : []), element('ul', {}, items)])];
    }
    if (node.type === 'docSteps' || node.type === 'docTimeline') return procedureTree(node, representation, walk, element, text, paragraph);
    if (representation === 'markdown' && node.data?.htmlOnly) return [];
    if (representation === 'html' && (node.data?.exampleOnly || node.data?.markdownOnly)) return [];
    if (node.type === 'docDiagram') {
      if (representation === 'markdown') return [
        paragraph({ type: 'strong', children: [text(node.title)] }),
        paragraph(text(node.summary)),
        paragraph(link(node.url, `View ${node.title} diagram`)),
        { type: 'code', lang: node.engine, value: node.source }
      ];
      if (node.diagramSvg) {
        const visual = element('div', { className: ['doc-diagram-visual'] }, []);
        Object.assign(visual.data, { hChildren: [diagramSvg(node.diagramSvg, node.title, `diagram-instance-${++diagramIndex}`)] });
        return [element('figure', { className: ['doc-diagram'], 'data-renderer': 'pele', ...(node.width ? { style: `max-width:${node.width}px` } : {}) }, [
          visual,
          element('figcaption', {}, [{ type: 'strong', children: [text(node.title)] }, text(` — ${node.summary}`)])
        ])];
      }
      return [element('figure', { className: ['doc-diagram'], 'data-color-mode': mode, ...(node.width ? { style: `max-width:${node.width}px` } : {}) }, [
        { type: 'image', url: node.url, alt: node.title, data: { hProperties: { className: ['diagram-light'] } } },
        { type: 'image', url: node.darkUrl, alt: node.title, data: { hProperties: { className: ['diagram-dark'] } } },
        element('figcaption', {}, [{ type: 'strong', children: [text(node.title)] }, text(` — ${node.summary}`)])
      ])];
    }
    // Images are phrasing nodes; keep standalone images inside a block so
    // Markdown serialization retains the separators between surrounding blocks.
    if (node.type === 'docImage') {
      const image = { type: 'image', url: node.url, alt: node.alt, ...(representation === 'html' ? { data: { hProperties: { className: ['doc-image', ...(node.align ? [`doc-image-align-${node.align}`] : [])], ...(node.width ? { style: `width:100%;max-width:${node.width}px` } : {}) } } } : {}) };
      if (representation === 'markdown') return [paragraph(image), ...(node.caption ? [paragraph(text(node.caption))] : []), ...(node.expand ? [paragraph(link(node.url, 'View original image'))] : [])];
      if (!node.expand && !node.caption) return [paragraph(image)];
      const visual = node.expand ? { type: 'link', url: node.url, data: { hProperties: { 'data-image-expand': '', 'aria-label': `Enlarge image: ${node.alt || 'Image'}` } }, children: [image] } : image;
      return [element('figure', { className: ['doc-image-figure', ...(node.align ? [`doc-image-align-${node.align}`] : [])], ...(node.width ? { style: `max-width:${node.width}px` } : {}) }, [paragraph(visual), ...(node.caption ? [element('figcaption', {}, [text(node.caption)])] : [])])];
    }
    if (node.type === 'themePreview') {
      const cell = (value: string, asCode: boolean) => ({ type: 'tableCell', children: [asCode ? { type: 'inlineCode', value } : text(value)] });
      const row = (values: string[], codeColumns: number[]) => ({ type: 'tableRow', children: values.map((value, column) => cell(value, codeColumns.includes(column))) });
      const table = (head: string[], rows: string[][], codeColumns: number[]) => ({ type: 'table', align: head.map(() => null), children: [row(head, []), ...rows.map(values => row(values, codeColumns))] });
      const fallback = [
        paragraph(text('Every preset works with every palette, in light or dark mode.')),
        table(['Preset', 'Shape', 'Default palette'], presetCatalog.map(preset => [preset.name, preset.shape, preset.palette]), [0, 2]),
        table(['Palette', 'Colors'], paletteCatalog.map(palette => [palette.name, palette.colors]), [0]),
        { type: 'code', lang: 'yaml', meta: 'title="docs.config.yaml"', value: 'theme:\n  preset: vice\n  palette: harbor\n  mode: system' }
      ];
      if (representation === 'markdown') return fallback;
      return [element('div', { className: ['theme-preview'], 'data-theme-preview': JSON.stringify({ presets: presetCatalog.map(({ name, palette, masthead }) => ({ name, palette, masthead })), palettes: paletteCatalog.map(palette => palette.name) }) }, [fallback[0], element('details', { className: ['theme-preview-catalog'] }, [element('summary', {}, [text('Browse themes and palettes')]), ...fallback.slice(1)])])];
    }
    if (node.type === 'docHero') {
      const links = node.links.map((item: any) => item.children ? { ...item, children: item.children.flatMap(walk) } : item);
      if (representation === 'markdown') return [
        ...(node.customTitle ? [paragraph({ type: 'strong', children: [text(node.title)] })] : []),
        paragraph(text(node.tagline)),
        ...(links.length ? [{ type: 'list', ordered: false, spread: false, children: links.map((item: any) => ({ type: 'listItem', spread: false, children: [paragraph(...walk(item))] })) }] : []),
        ...(node.image && node.image.alt ? [paragraph({ type: 'image', url: node.image.url, alt: node.image.alt })] : []),
        ...(node.code ? [node.code] : [])
      ];
      // With an image or code block the hero becomes two columns: text, then the visual.
      const visual = node.image
        ? [element('div', { className: ['hero-visual'] }, [{ type: 'image', url: node.image.url, alt: node.image.alt, data: { hProperties: { loading: 'eager', decoding: 'async' } } }])]
        : node.code ? [element('div', { className: ['hero-visual', 'hero-visual-code'] }, [node.code])] : [];
      const copy = [
        element('h1', { className: ['hero-title'] }, [text(node.title)]),
        element('p', { className: ['hero-tagline'] }, [text(node.tagline)]),
        ...(links.length ? [element('div', { className: ['hero-actions'] }, links.map((item: any, index: number) => ({ ...item, data: { hProperties: { className: ['hero-action', index ? 'hero-secondary' : 'hero-primary'] } } })))] : [])
      ];
      return [element('section', { className: ['hero', ...(visual.length ? ['has-visual'] : [])], 'data-hero': '', ...(node.align === 'start' || visual.length ? { 'data-align': 'start' } : {}) }, visual.length ? [element('div', { className: ['hero-copy'] }, copy), ...visual] : copy)];
    }
    if (node.type === 'docSection') {
      const children = node.children.flatMap(walk);
      if (representation === 'markdown') return children;
      return [element('section', { className: ['splash-section'], ...(node.variant ? { 'data-variant': node.variant } : {}), ...(node.sectionId ? { id: node.sectionId } : {}) }, [element('div', { className: ['splash-inner'] }, children)])];
    }
    if (node.type === 'docCollapsibleGroup') {
      const children = node.children.flatMap(walk);
      return representation === 'markdown' ? children : [element('div', { className: ['doc-collapsible-group'] }, children)];
    }
    if (node.type === 'docCollapsible') {
      const children = node.children.flatMap(walk);
      if (representation === 'markdown') return [heading(3, node.title), ...children];
      return [element('details', { className: ['doc-collapsible'], ...(node.open ? { open: true } : {}) }, [element('summary', {}, [text(node.title)]), element('div', { className: ['collapsible-body'] }, children)])];
    }
    if (node.type === 'docWalkthrough') return representation === 'markdown' ? walkthroughMarkdown(node, walk, { heading, paragraph, text }) : walkthroughHtml(node, walk, element, text);
    if (node.type === 'docTabs') {
      if (representation === 'markdown') return node.children.flatMap((tab: any) => [heading(3, tab.label), ...tab.children.flatMap(walk)]);
      const links = node.children.map((tab: any, index: number) => ({ ...link(`#${node.id}-panel-${index + 1}`, tab.label), data: { hProperties: { 'data-tab-value': tab.value } } }));
      const panels = node.children.map((tab: any, index: number) => element('section', { id: `${node.id}-panel-${index + 1}`, className: ['doc-tabpanel'] }, [
        { ...heading(3, tab.label), data: { hProperties: { className: ['tab-fallback-heading'] } } },
        ...tab.children.flatMap(walk)
      ]));
      return [element('div', { className: ['doc-tabs'], 'data-tabs': '', ...(node.sync ? { 'data-tab-sync': node.sync } : {}), ...(node.equalHeight ? { 'data-equal-height': '' } : {}) }, [element('div', { className: ['doc-tablist'], 'aria-label': node.label }, links), ...panels])];
    }
    if (node.type === 'link' && documentRoutes.has(node.url) && representation === 'markdown') return [{ ...node, url: markdownRoute(node.url, basePath), children: node.children.flatMap(walk) }];
    if (node.children) return [{ ...node, children: node.children.flatMap(walk) }];
    return [node];
  };
  return walk(tree)[0];
}

// Resolve authored links against the published page route, then use the public
// origin when one is configured. Keep fragment-only links local to the page.
export function outputUrl(value: string, pageRoute: string, origin: string | undefined, representation: 'html' | 'markdown', documentRoutes: Set<string>, basePath = ''): string {
  if (!value || value.startsWith('#') || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) return value;
  const target = new URL(value, `https://shoalrun.invalid${basePath && pageRoute === basePath ? `${pageRoute}/` : pageRoute}`);
  if (basePath && value.startsWith('/') && target.pathname !== basePath && !target.pathname.startsWith(`${basePath}/`)) target.pathname = `${basePath}${target.pathname}`;
  if (representation === 'markdown' && documentRoutes.has(target.pathname)) target.pathname = markdownRoute(target.pathname, basePath);
  return `${origin ?? ''}${target.pathname}${target.search}${target.hash}`;
}

export function resolveOutputLinks(tree: any, pageRoute: string, origin: string | undefined, representation: 'html' | 'markdown', documentRoutes: Set<string>, basePath = ''): any {
  const walk = (node: any): any => {
    const resolved = { ...node };
    if (['link', 'image', 'definition'].includes(node.type) && typeof node.url === 'string') resolved.url = outputUrl(node.url, pageRoute, node.type === 'image' && representation === 'html' ? undefined : origin, node.data?.htmlDestination ? 'html' : representation, documentRoutes, basePath);
    if (node.data?.hProperties) {
      const properties = { ...node.data.hProperties };
      for (const key of ['href', 'src']) if (typeof properties[key] === 'string') properties[key] = outputUrl(properties[key], pageRoute, key === 'src' && representation === 'html' ? undefined : origin, node.data?.htmlDestination ? 'html' : representation, documentRoutes, basePath);
      resolved.data = { ...node.data, hProperties: properties };
    }
    if (node.children) resolved.children = node.children.map(walk);
    return resolved;
  };
  return walk(tree);
}

// Search runs in the reader's browser. The framework owns the header box; a provider module owns retrieval.
