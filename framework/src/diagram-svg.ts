import { parseFragment } from 'parse5';

// Only generated Pele SVG enters this path. Reject active content even if an
// upstream renderer or a project cache changes; arbitrary HTML is never enabled.
const tags = new Set(['svg', 'g', 'defs', 'marker', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'title', 'desc', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'pattern', 'symbol', 'use']);

export function diagramSvg(svg: string, title: string, prefix: string): any {
  const fragment = parseFragment(svg);
  const roots = fragment.childNodes.filter((node: any) => node.nodeName !== '#text' || node.value.trim());
  if (roots.length !== 1 || roots[0].nodeName !== 'svg') throw new Error('Expected one generated diagram SVG');
  const rewrite = (value: string) => value.replace(/url\(\s*["']?#([^\s)"']+)["']?\s*\)/g, (_, id) => `url(#${prefix}-${id})`);
  const convert = (node: any): any => {
    if (node.nodeName === '#text') return { type: 'text', value: node.value };
    if (!tags.has(node.tagName)) throw new Error(`Unsafe diagram SVG element: ${node.tagName ?? node.nodeName}`);
    const properties: Record<string, string> = {};
    for (const attr of node.attrs ?? []) {
      if (/^on/i.test(attr.name)) throw new Error('Unsafe diagram SVG event handler');
      let value = attr.value;
      if (attr.name === 'href') {
        if (!value.startsWith('#')) throw new Error('External references are not allowed in diagram SVG');
        value = `#${prefix}-${value.slice(1)}`;
      } else if (attr.name === 'id') value = `${prefix}-${value}`;
      else if (['aria-labelledby', 'aria-describedby'].includes(attr.name)) value = value.split(/\s+/).map((id: string) => `${prefix}-${id}`).join(' ');
      else {
        value = rewrite(value);
        if (/url\(/i.test(value.replace(/url\(#[^)]+\)/g, ''))) throw new Error('External styles are not allowed in diagram SVG');
      }
      properties[attr.name === 'class' ? 'className' : attr.prefix === 'xlink' ? 'xLinkHref' : attr.name] = value;
    }
    return { type: 'element', tagName: node.tagName, properties, children: (node.childNodes ?? []).map(convert) };
  };
  const root = convert(roots[0]);
  root.properties.role = 'img';
  root.properties.ariaLabel = title;
  root.properties.className = `${root.properties.className ?? ''} doc-diagram-svg`.trim();
  return root;
}
