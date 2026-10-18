// Without this enhancement, the label and explanation stay visible in the page.
let sequence = 0;
const instances = [];
for (const root of document.querySelectorAll('[data-tooltip]')) {
  const label = root.querySelector('.doc-tooltip-trigger');
  const popup = root.querySelector('.doc-tooltip-popup');
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = label.className;
  trigger.textContent = label.textContent;
  let id;
  do { id = `shoalrun-tooltip-${++sequence}`; } while (document.getElementById(id));
  popup.id = id;
  trigger.setAttribute('aria-describedby', popup.id);
  popup.setAttribute('role', 'tooltip');
  popup.dataset.tooltipEnhanced = '';
  popup.hidden = true;
  document.body.append(popup);
  root.querySelector('.doc-tooltip-separator').hidden = true;
  label.replaceWith(trigger);

  let open = false;
  let hovering = false;
  let dismissed = false;
  let pointerWasOpen = false;
  let closeTimer;
  const position = () => {
    if (!open) return;
    const anchor = trigger.getBoundingClientRect();
    const box = popup.getBoundingClientRect();
    const left = Math.max(8, Math.min(anchor.left, innerWidth - box.width - 8));
    const top = anchor.bottom + box.height + 14 <= innerHeight ? anchor.bottom + 6 : Math.max(8, anchor.top - box.height - 6);
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  };
  const show = () => {
    clearTimeout(closeTimer);
    if (dismissed) return;
    open = true;
    popup.hidden = false;
    position();
  };
  const hide = (dismiss = false) => {
    clearTimeout(closeTimer);
    open = false;
    popup.hidden = true;
    dismissed = dismiss;
  };
  const leave = () => {
    hovering = false;
    closeTimer = setTimeout(() => {
      if (!hovering && document.activeElement !== trigger) hide();
    }, 120);
  };
  for (const element of [trigger, popup]) {
    element.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      hovering = true;
      dismissed = false;
      show();
    });
    element.addEventListener('pointerleave', leave);
  }
  trigger.addEventListener('focus', () => { dismissed = false; show(); });
  trigger.addEventListener('blur', () => { if (!hovering) hide(); });
  trigger.addEventListener('pointerdown', () => { pointerWasOpen = open; });
  trigger.addEventListener('click', event => {
    const close = event.detail ? pointerWasOpen : open;
    if (close) hide(true);
    else { dismissed = false; show(); }
  });
  instances.push({ trigger, popup, hide, position });
}
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') for (const instance of instances) instance.hide(true);
});
document.addEventListener('pointerdown', event => {
  for (const instance of instances) if (!instance.trigger.contains(event.target) && !instance.popup.contains(event.target)) instance.hide(true);
});
window.addEventListener('resize', () => instances.forEach(instance => instance.position()));
window.addEventListener('scroll', () => instances.forEach(instance => instance.position()), true);
