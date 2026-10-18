import path from 'node:path';
import YAML from 'yaml';
import { explainSegments, type loadConfig } from './config.js';
import { parse } from './semantic-markdown.js';
import type { SnapshotCapture } from './authoring-snapshot.js';

export type ValidationFinding = { code: string; severity: 'error' | 'warning' | 'review-needed'; file?: string; location?: { line: number; column: number; key?: string }; relatedFiles?: string[]; explanation: string; reference?: string; nextAction: string };

export function configFindingLocation(loaded: Awaited<ReturnType<typeof loadConfig>>, segments: string[], capture: SnapshotCapture, shadow: string) {
  try {
    const owner = explainSegments(loaded, segments).source.file;
    const file = path.relative(shadow, owner);
    const content = capture.buffers.get(file)?.toString('utf8');
    if (!content) return { file };
    const parsed = YAML.parseDocument(content);
    // Includes may own a subtree rather than the project root. Find the longest
    // suffix present in that source instead of assuming the root's YAML shape.
    for (let start = 0; start < segments.length; start++) {
      const node: any = parsed.getIn(segments.slice(start).map(segment => /^\d+$/.test(segment) ? Number(segment) : segment), true);
      if (node?.range) {
        const prefix = content.slice(0, node.range[0]);
        return { file, location: { line: prefix.split('\n').length, column: prefix.length - prefix.lastIndexOf('\n'), key: segments.join('.') } };
      }
    }
    return { file };
  } catch { return {}; }
}

export function validationFinding(error: unknown, capture: SnapshotCapture, shadow: string, loaded?: Awaited<ReturnType<typeof loadConfig>>): ValidationFinding {
  const message = error instanceof Error ? error.message : String(error);
  const component = /<([A-Za-z][A-Za-z0-9]*)>/.exec(message)?.[1];
  const code = component ? 'validation.component' : /[Rr]elationship|Prerequisite cycle/.test(message) ? 'validation.relationship' : /[Nn]avigation/.test(message) ? 'validation.navigation' : /[Ll]ink|unknown document|doc:|card target/.test(message) ? 'validation.link' : /[Rr]oute|[Ss]lug|Duplicate document identity/.test(message) ? 'validation.identity' : /frontmatter|missing (?:id|title|type|summary)|updated|releaseVersion|publication/.test(message) ? 'validation.metadata' : 'validation.compile';
  let file = capture.inputs.map(input => input.file).sort((a, b) => b.length - a.length).find(file => message.includes(path.resolve(shadow, file)) || message.startsWith(`${file}:`));
  let location: ValidationFinding['location'];
  const relatedFiles: string[] = [];
  if (!file && code === 'validation.identity') {
    const identities = [...message.matchAll(/([A-Za-z0-9._-]+)\|/g)].map(match => match[1]);
    const named = /^([^:]+): invalid slug/.exec(message)?.[1];
    if (named) identities.push(named);
    for (const [candidate, content] of capture.buffers) if (/\.mdx?$/.test(candidate)) {
      const header = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content.toString('utf8'));
      try { if (header && identities.includes(YAML.parse(header[1])?.id)) relatedFiles.push(candidate); } catch { /* Malformed metadata is diagnosed independently. */ }
    }
    if (relatedFiles.length) file = relatedFiles[0];
  }
  if (loaded && ['validation.navigation', 'validation.relationship'].includes(code)) {
    const candidates: string[][] = [];
    if (code === 'validation.relationship') (loaded.value.relationships as any[] ?? []).forEach((edge, index) => { if (message.includes(`Relationship ${edge.id} `)) candidates.push(['relationships', String(index)]); });
    else {
      const visit = (nodes: any[], segments: string[]) => nodes.forEach((node, index) => {
        const at = [...segments, String(index)];
        if (node.doc && message.includes(`missing document ${node.doc}`) || node.id && message.endsWith(`: ${node.id}`)) candidates.push(node.doc && message.includes(`missing document ${node.doc}`) ? [...at, 'doc'] : at);
        if (Array.isArray(node.items)) visit(node.items, [...at, 'items']);
      });
      if (Array.isArray(loaded.value.navigation)) visit(loaded.value.navigation, ['navigation']);
    }
    if (candidates.length === 1) ({ file, location } = configFindingLocation(loaded, candidates[0], capture, shadow));
  }
  if (file) {
    const source = capture.buffers.get(file)?.toString('utf8') ?? '';
    const header = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source);
    if (component) {
      try {
        const candidates: any[] = [];
        const visit = (node: any, parent?: any) => {
          if (node.name === component && (component !== 'Step' || !/must be directly inside/.test(message) || !['Steps', 'Walkthrough'].includes(parent?.name))) candidates.push(node);
          for (const child of node.children ?? []) visit(child, node);
        };
        visit(parse.parse(source.slice(header?.[0].length ?? 0)));
        if (candidates.length === 1 && candidates[0].position?.start) location = { line: candidates[0].position.start.line + (header?.[0].split('\n').length ?? 1) - 1, column: candidates[0].position.start.column };
      } catch { /* Parser/compiler details remain available when no exact node is known. */ }
    } else if (!location) {
      const target = /unknown document (\S+)|missing document (\S+)/.exec(message);
      const token = target ? `doc:${target[1] ?? target[2]}` : code === 'validation.identity' ? /Duplicate document identity/.test(message) ? 'id:' : 'slug:' : /missing (\w+)/.exec(message)?.[1] ?? /: (\w+) must/.exec(message)?.[1];
      if (token) {
        const positions = [...source.matchAll(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))];
        if (positions.length === 1) {
          const prefix = source.slice(0, positions[0].index);
          location = { line: prefix.split('\n').length, column: prefix.length - prefix.lastIndexOf('\n') };
        }
      }
    }
  }
  return { code, severity: 'error', ...(file ? { file } : {}), ...(location ? { location } : {}), ...(relatedFiles.length > 1 ? { relatedFiles } : {}), explanation: message.split(shadow + path.sep).join('') + (component === 'Step' ? ' <Step> is an authored MDX component; harness task-plan steps are separate.' : ''),
    ...(component === 'Step' || component === 'Steps' ? { reference: 'guide.component.steps' } : code === 'validation.metadata' ? { reference: 'guide.frontmatter-reference' } : {}),
    nextAction: component === 'Step' ? 'Group the authored procedure in <Steps> using the canonical Steps example, or use the separate Walkthrough contract; then validate again.' : 'Repair the reported source or configuration and validate the working tree again.' };
}
