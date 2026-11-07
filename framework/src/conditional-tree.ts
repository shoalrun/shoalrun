/** Validate every guard, including excluded descendants, without expanding dependencies. */
export function pruneConditionalTree(tree: any, evaluate: (node: any, ancestorIncluded: boolean) => boolean | undefined): any {
  const walk = (node: any, ancestorIncluded = true): any[] => {
    if (!node || typeof node !== 'object') return [node];
    const match = evaluate(node, ancestorIncluded);
    if (match !== undefined) {
      const children = (node.children ?? []).flatMap((child: any) => walk(child, ancestorIncluded && match));
      return ancestorIncluded && match ? children : [];
    }
    return [{ ...node, ...(node.children ? { children: node.children.flatMap((child: any) => walk(child, ancestorIncluded)) } : {}) }];
  };
  return walk(tree)[0];
}
