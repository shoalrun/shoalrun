import { stepIcon, validateLucideIcon } from './icons.js';

type Item = { title: string; id?: string; date?: string; icon?: string; children: any[] };

export function procedureComponent(node: any, sourceFile: string, transformChildren: (children: any[]) => any[]): any {
  const timeline = node.name === 'Timeline';
  const container = timeline ? 'Timeline' : 'Steps';
  const itemName = timeline ? 'Milestone' : 'Step';
  const containerAttributes = node.attributes ?? [];
  const allowedContainer = timeline ? ['current'] : ['variant', 'toc', 'headingLevel'];
  if (node.type !== 'mdxJsxFlowElement' || !node.children?.length || containerAttributes.some((attribute: any) => attribute.type !== 'mdxJsxAttribute' || !allowedContainer.includes(attribute.name) || typeof attribute.value !== 'string') || new Set(containerAttributes.map((attribute: any) => attribute.name)).size !== containerAttributes.length) throw new Error(`${sourceFile}: <${container}> needs direct <${itemName}> children and supported literal attributes`);
  const containerValue = (name: string) => containerAttributes.find((attribute: any) => attribute.name === name)?.value?.trim();
  const variant = timeline ? undefined : containerValue('variant') ?? 'rail';
  const toc = timeline ? undefined : containerValue('toc') ?? 'ignore';
  const headingLevel = timeline ? undefined : Number(containerValue('headingLevel') ?? '2');
  if (!timeline && !['rail', 'cards', 'plain'].includes(variant)) throw new Error(`${sourceFile}: <Steps> variant must be rail, cards, or plain`);
  if (!timeline && !['include', 'ignore'].includes(toc)) throw new Error(`${sourceFile}: <Steps> toc must be include or ignore`);
  if (!timeline && !['2', '3', '4', '5', '6'].includes(containerValue('headingLevel') ?? '2')) throw new Error(`${sourceFile}: <Steps> headingLevel must be 2, 3, 4, 5, or 6`);
  if (timeline && !containerValue('current')) throw new Error(`${sourceFile}: <Timeline> needs a nonempty current milestone id`);
  const directChildren = node.children.flatMap((child: any) => child.type === 'paragraph' ? child.children : [child]).filter((child: any) => child.type !== 'text' || child.value.trim());
  const items: Item[] = directChildren.map((item: any) => {
    const attributes = item.attributes ?? [];
    const allowed = timeline ? ['id', 'title', 'date'] : ['title', 'icon'];
    if (!['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(item.type) || item.name !== itemName || attributes.some((attribute: any) => attribute.type !== 'mdxJsxAttribute' || !allowed.includes(attribute.name) || typeof attribute.value !== 'string') || new Set(attributes.map((attribute: any) => attribute.name)).size !== attributes.length) throw new Error(`${sourceFile}: <${container}> only accepts <${itemName}> with ${allowed.join(', ')} attributes`);
    const value = (name: string) => attributes.find((attribute: any) => attribute.name === name)?.value?.trim();
    const title = value('title');
    if (!title) throw new Error(`${sourceFile}: <${itemName}> needs a nonempty title`);
    const id = timeline ? value('id') : undefined;
    if (timeline && (!id || !/^[a-z][a-z0-9-]*$/.test(id))) throw new Error(`${sourceFile}: <Milestone> id must use lowercase letters, numbers, and hyphens, starting with a letter`);
    const date = timeline ? value('date') : undefined;
    const icon = timeline ? undefined : value('icon');
    if (icon) validateLucideIcon(icon, sourceFile, 'Step icon');
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)) throw new Error(`${sourceFile}: <Milestone> date must be a real YYYY-MM-DD date`);
    const transformed = transformChildren(item.children ?? []);
    if (!transformed.length || transformed.every((child: any) => child.type === 'text' && !child.value.trim())) throw new Error(`${sourceFile}: <${itemName}> needs body content`);
    const children = item.type === 'mdxJsxTextElement' ? [{ type: 'paragraph', children: transformed }] : transformed;
    return { title, ...(id ? { id } : {}), ...(date ? { date } : {}), ...(icon ? { icon } : {}), children };
  });
  if (timeline) {
    const ids = items.map(item => item.id);
    if (new Set(ids).size !== ids.length) throw new Error(`${sourceFile}: <Timeline> milestone ids must be unique`);
    const currentIndex = ids.indexOf(containerValue('current'));
    if (currentIndex < 0) throw new Error(`${sourceFile}: <Timeline> current must match a milestone id`);
    return { type: 'docTimeline', currentIndex, items };
  }
  return { type: 'docSteps', variant, toc, headingLevel, items };
}

export function procedureTree(node: any, representation: 'html' | 'markdown', walk: (node: any) => any[], element: (name: string, properties: Record<string, unknown>, children: any[]) => any, text: (value: string) => any, paragraph: (...children: any[]) => any): any[] {
  const timeline = node.type === 'docTimeline';
  if (representation === 'markdown') {
    const summary = timeline ? [paragraph(text(`${node.currentIndex} of ${node.items.length} milestones complete. Current: ${node.items[node.currentIndex].title}.`))] : [];
    return [...summary, { type: 'list', ordered: true, spread: true, children: node.items.map((item: Item, index: number) => ({
      type: 'listItem', spread: true, children: [
        ...(timeline ? [paragraph({ type: 'strong', children: [text(`${index < node.currentIndex ? 'Complete' : index === node.currentIndex ? 'Current' : 'Upcoming'}: ${item.title}${item.date ? ` (${item.date})` : ''}`)] })] : [{ type: 'heading', depth: node.headingLevel, children: [text(item.title)] }]),
        ...item.children.flatMap(walk)
      ]
    })) }];
  }
  if (timeline) {
    const current = node.items[node.currentIndex] as Item;
    const summary = `${node.currentIndex} of ${node.items.length} milestones complete · Current: ${current.title}`;
    const items = node.items.map((item: Item, index: number) => {
      const status = index < node.currentIndex ? 'complete' : index === node.currentIndex ? 'current' : 'upcoming';
      return element('li', { className: [`doc-milestone-${status}`], ...(status === 'current' ? { 'aria-current': 'step' } : {}) }, [
        element('div', { className: ['doc-milestone-head'] }, [
          { type: 'strong', children: [text(item.title)] },
          element('span', { className: ['doc-milestone-status'] }, [text(status === 'complete' ? 'Complete' : status === 'current' ? 'Current' : 'Upcoming')]),
          ...(item.date ? [element('time', { dateTime: item.date }, [text(item.date)])] : [])
        ]),
        element('div', { className: ['doc-milestone-body'] }, item.children.flatMap(walk))
      ]);
    });
    return [element('section', { className: ['doc-timeline'], 'aria-label': 'Progress timeline' }, [
      element('div', { className: ['doc-timeline-summary'] }, [text(summary)]),
      element('progress', { className: ['doc-timeline-progress'], value: node.currentIndex, max: node.items.length, 'aria-label': 'Milestones complete' }, []),
      element('ol', { className: ['doc-timeline-list'], role: 'list' }, items)
    ])];
  }
  const items = node.items.map((item: Item) => element('li', {}, [
    element(`h${node.headingLevel}`, { className: ['doc-step-head', ...(node.toc === 'ignore' ? ['doc-step-heading-toc-ignore'] : [])] }, [...(item.icon ? [stepIcon(item.icon)] : []), text(item.title)]),
    element('div', { className: ['doc-step-body'] }, item.children.flatMap(walk))
  ]));
  return [element('ol', { className: ['doc-steps', `doc-steps-${node.variant}`], ...(node.variant !== 'plain' ? { role: 'list' } : {}) }, items)];
}
