// Walkthroughs are complete without scripts: every step shows its explanation and code in order.
// On wide screens this adds a code pane beside the steps; tokens that stay the same between steps move
// to their new place. The scroll layout keeps the whole walkthrough in view while its steps scroll.
// The spotlight layout turns step titles into buttons and shows one step's explanation at a time.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const SPLIT_WIDTH = 720;

for (const root of document.querySelectorAll('.walkthrough[data-walkthrough]')) {
  const unified = root.dataset.mode === 'unified';
  const spotlight = root.dataset.layout === 'spotlight';
  const list = root.querySelector(':scope > .walkthrough-steps');
  const steps = [...list.children];
  const shared = root.querySelector(':scope > .walkthrough-code');
  const sources = unified ? [] : steps.map(step => step.querySelector(':scope > .walkthrough-code pre'));

  // The pane shows copies of each step's code. The originals stay in their steps, out of sight, so screen
  // readers still meet code beside its explanation. The pane's code is a labelled region that keyboard users
  // can scroll, and one Copy button copies the code on show.
  const pane = document.createElement('div');
  pane.className = 'walkthrough-pane';
  const bar = document.createElement('div');
  bar.className = 'walkthrough-bar';
  const status = document.createElement('span');
  status.className = 'walkthrough-status';
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'code-copy';
  copy.textContent = 'Copy';
  // Copy results are announced here; the button's own label names the step it copies.
  const announce = document.createElement('span');
  announce.className = 'copy-status';
  announce.setAttribute('role', 'status');
  bar.append(status, copy, announce);
  const stage = document.createElement('div');
  stage.className = 'walkthrough-stage';
  pane.append(bar, stage);

  const originals = unified ? [shared.querySelector('pre')] : sources;
  const views = originals.map(pre => pre?.cloneNode(true));
  // The pane's toolbar repeats each code block's title or file name.
  const names = originals.map(pre => [...(pre?.closest('.code-block')?.querySelectorAll(':scope > .code-toolbar .code-block-meta > span') ?? [])].map(item => item.textContent).join(' — '));
  for (const view of views) {
    if (!view) continue;
    view.tabIndex = 0;
    view.setAttribute('role', 'region');
    view.hidden = true;
    stage.append(view);
  }
  // A step without code keeps showing the code before it.
  const viewFor = index => { for (let at = index; at >= 0; at--) if (views[unified ? 0 : at]) return views[unified ? 0 : at]; return views.find(Boolean); };

  let active = -1;
  let buttons = [];
  let shown;
  const show = (index, animate, trigger) => {
    if (index === active) return;
    active = index;
    if (trigger) globalThis.shoalrunAnalytics?.track('walkthrough_step_change', { stepIndex: index, stepCount: steps.length, layout: spotlight ? 'spotlight' : 'scroll', trigger }, root);
    steps.forEach((step, at) => step.classList.toggle('is-active', at === index));
    const name = names[unified ? 0 : views.indexOf(viewFor(index))];
    status.textContent = `${name ? `${name} · ` : ''}Step ${index + 1} of ${steps.length}`;
    copy.setAttribute('aria-label', `Copy code for step ${index + 1}`);
    buttons.forEach((button, at) => button.setAttribute('aria-expanded', String(at === index)));
    const next = viewFor(index);
    next.setAttribute('aria-label', `Code for step ${index + 1}; the step also includes it`);
    if (unified) highlight(next, steps[index].dataset.highlight);
    if (next !== shown) {
      const previous = shown;
      shown = next;
      if (animate && previous && !reduced.matches) morph(previous, next);
      else { if (previous) previous.hidden = true; next.hidden = false; }
    }
    focusLines(next, animate);
  };

  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shown?.querySelector('code')?.textContent ?? '');
      globalThis.shoalrunAnalytics?.track('code_copy', { stepIndex: active, language: shown?.querySelector('code')?.className.match(/language-([\w-]+)/)?.[1] ?? '' }, root);
      copy.textContent = 'Copied';
      announce.textContent = `Copied code for step ${active + 1}`;
    } catch {
      copy.textContent = 'Copy failed';
      announce.textContent = 'Copy failed';
    }
    setTimeout(() => { copy.textContent = 'Copy'; announce.textContent = ''; }, 1600);
  });

  // The active step is the last one whose top has passed a reading line in the step scroller.
  // At the end, show the final step even when it cannot reach that line.
  let frame = 0;
  const track = (interaction = false) => {
    frame = 0;
    const line = list.getBoundingClientRect().top + Math.min(96, list.clientHeight / 3);
    let index = 0;
    steps.forEach((step, at) => { if (step.getBoundingClientRect().top <= line) index = at; });
    if (list.scrollHeight > list.clientHeight + 2 && list.scrollTop + list.clientHeight >= list.scrollHeight - 2) index = steps.length - 1;
    show(index, true, interaction ? 'scroll' : undefined);
  };
  const onScroll = () => { frame ||= requestAnimationFrame(() => track(true)); };
  // Wheel input over either column advances the steps. When they reach an edge, let the page scroll.
  const onWheel = event => {
    if (!split || spotlight || event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? list.clientHeight : 1;
    const amount = event.deltaY * unit;
    const next = Math.max(0, Math.min(list.scrollHeight - list.clientHeight, list.scrollTop + amount));
    if (Math.abs(next - list.scrollTop) < 1) return;
    event.preventDefault();
    list.scrollTop = next;
  };
  // Clicking a step shows it at once; links inside it still work.
  steps.forEach((step, index) => step.addEventListener('click', event => {
    if (!split || event.target.closest('a, button') || getSelection()?.toString()) return;
    show(index, true, 'click');
  }));

  // Spotlight titles become buttons while the pane shows; Up and Down move between them.
  const titles = steps.map(step => step.querySelector(':scope > .walkthrough-step-title'));
  const addButtons = () => {
    buttons = titles.map((title, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'walkthrough-step-button';
      button.append(...title.childNodes);
      title.append(button);
      button.addEventListener('click', () => show(index, true, 'click'));
      button.addEventListener('keydown', event => {
        const next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: steps.length - 1 }[event.key];
        if (next === undefined || next < 0 || next >= steps.length) return;
        event.preventDefault();
        buttons[next].focus();
        show(next, true, 'keyboard');
      });
      return button;
    });
  };
  const removeButtons = () => {
    buttons.forEach((button, index) => {
      const focused = button === document.activeElement;
      titles[index].append(...button.childNodes);
      button.remove();
      // Keep a keyboard user's place when the layout narrows under them.
      if (focused) { titles[index].tabIndex = -1; titles[index].focus({ preventScroll: true }); }
    });
    buttons = [];
  };

  let split = false;
  const layout = () => {
    // The split style adds a border. Measure the stable outer box so that
    // crossing the threshold cannot undo itself after that border is applied.
    const wide = root.getBoundingClientRect().width >= SPLIT_WIDTH;
    if (wide === split) return;
    split = wide;
    root.classList.toggle('is-split', wide);
    // Hidden originals leave the tab order so focus never lands on something invisible.
    for (const element of root.querySelectorAll('.walkthrough-code :is(pre, button)')) {
      if (wide) { element.dataset.tabindex = element.getAttribute('tabindex') ?? ''; element.tabIndex = -1; }
      else if (element.dataset.tabindex !== undefined) { element.dataset.tabindex ? element.setAttribute('tabindex', element.dataset.tabindex) : element.removeAttribute('tabindex'); delete element.dataset.tabindex; }
    }
    if (wide) {
      list.after(pane);
      if (spotlight) addButtons();
      else {
        list.tabIndex = 0;
        list.setAttribute('aria-label', `Steps for ${root.getAttribute('aria-label')}`);
        list.addEventListener('scroll', onScroll, { passive: true });
        root.addEventListener('wheel', onWheel, { passive: false });
      }
      const current = Math.max(active, 0);
      active = -1;
      show(current, false);
      if (!spotlight) track();
    } else {
      list.removeEventListener('scroll', onScroll);
      root.removeEventListener('wheel', onWheel);
      list.removeAttribute('tabindex');
      list.removeAttribute('aria-label');
      removeButtons();
      pane.remove();
    }
  };
  if (views.some(Boolean)) {
    new ResizeObserver(layout).observe(root);
    layout();
  }
}

function highlight(view, value) {
  const lines = new Set((value ?? '').split(' ').filter(Boolean).map(Number));
  view.querySelectorAll(':scope > code > .line').forEach((line, index) => line.classList.toggle('is-highlighted', lines.has(index + 1)));
  view.toggleAttribute('data-focus', lines.size > 0);
}

// Keep the first highlighted line in view inside the pane.
function focusLines(view, animate) {
  const first = view.querySelector('.line.is-highlighted');
  const top = first ? Math.max(0, first.offsetTop - view.clientHeight / 3) : 0;
  view.scrollTo({ top, behavior: animate && !reduced.matches ? 'smooth' : 'auto' });
}

// FLIP: measure tokens in the old code, swap, then play each kept token from its old position to its new one.
// Removed tokens fade out on a snapshot of the old code; new tokens fade in after the movement starts.
function morph(from, to) {
  const before = new Map();
  for (const token of from.querySelectorAll('[data-k]')) before.set(token.dataset.k, token.getBoundingClientRect());
  const ghost = from.cloneNode(true);
  ghost.classList.add('walkthrough-ghost');
  ghost.inert = true;
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.top = `${from.offsetTop}px`;
  ghost.style.height = `${from.offsetHeight}px`;
  const scrollTop = from.scrollTop;
  const scrollLeft = from.scrollLeft;
  from.hidden = true;
  to.hidden = false;
  from.after(ghost);
  ghost.scrollTop = scrollTop;
  ghost.scrollLeft = scrollLeft;
  const kept = new Set();
  const timing = { duration: 480, easing: 'cubic-bezier(.2,.7,.2,1)' };
  for (const token of to.querySelectorAll('[data-k]')) {
    const old = before.get(token.dataset.k);
    if (!old) { token.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 220, fill: 'backwards' }); continue; }
    kept.add(token.dataset.k);
    const now = token.getBoundingClientRect();
    const dx = old.left - now.left;
    const dy = old.top - now.top;
    if (dx || dy) token.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], timing);
  }
  for (const token of ghost.querySelectorAll('[data-k]')) if (kept.has(token.dataset.k)) token.style.visibility = 'hidden';
  ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).finished.then(() => ghost.remove(), () => ghost.remove());
}
