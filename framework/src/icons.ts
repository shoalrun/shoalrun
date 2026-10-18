import { icons, type IconNode } from 'lucide';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const iconLicenseFile = path.join(path.dirname(fileURLToPath(import.meta.resolve('lucide/package.json'))), 'LICENSE');

function iconNodes(name: string): IconNode | undefined {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) return undefined;
  const key = name.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join('');
  return Object.hasOwn(icons, key) ? icons[key as keyof typeof icons] : undefined;
}

export function validateCardIcon(name: string, file: string): void {
  validateLucideIcon(name, file, 'card.icon');
}

export function validateLucideIcon(name: string, file: string, field: string): void {
  if (!iconNodes(name)) throw new Error(`${file}: unknown Lucide ${field} "${name}"; use a lowercase icon name such as book-open`);
}

function lucideIcon(name: string, className: string, type: string): any {
  const nodes = iconNodes(name);
  if (!nodes) throw new Error(`Unknown Lucide icon ${name}`);
  return {
    type, value: '', children: [],
    data: {
      htmlOnly: true,
      hName: 'svg',
      hProperties: {
        xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', width: 24, height: 24,
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round',
        ariaHidden: 'true', focusable: 'false', className: [className], 'data-lucide': name
      },
      hChildren: nodes.map(([tagName, properties]) => ({ type: 'element', tagName, properties: { ...properties }, children: [] }))
    }
  };
}

export function cardIcon(name: string): any { return lucideIcon(name, 'doc-card-icon', 'paragraph'); }
export function calloutIcon(name: string): any { return lucideIcon(name, 'callout-icon', 'text'); }
export function treeIcon(name: string): any { return lucideIcon(name, 'file-tree-icon', 'text'); }
export function badgeIcon(name: string): any { return lucideIcon(name, 'doc-badge-icon', 'text'); }
export function stepIcon(name: string): any { return lucideIcon(name, 'doc-step-icon', 'text'); }
