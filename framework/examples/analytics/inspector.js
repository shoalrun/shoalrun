// Local debugging only: no requests, identifiers, or persistent storage.
const events = [];
let panel;
let output;
let label;
export function init() {
  panel = document.createElement('details');
  panel.id = 'analytics-inspector';
  panel.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:9999;max-width:calc(100vw - 32px);width:440px;background:#101820;color:#e8f0f0;border:1px solid #52636b;border-radius:8px;padding:12px;font:13px/1.5 monospace;box-shadow:0 4px 24px #0006';
  label = document.createElement('summary');
  label.style.cursor = 'pointer';
  output = document.createElement('pre');
  output.style.cssText = 'max-height:40vh;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0 0';
  output.setAttribute('aria-label', 'Recent analytics events');
  panel.append(label, output);
  document.body.append(panel);
  globalThis.shoalrunDebugEvents = events;
}
export function track(event) {
  events.push(event);
  if (events.length > 100) events.shift();
  label.textContent = `Local events (${events.length})`;
  output.textContent = events.slice().reverse().map(item => JSON.stringify(item, null, 2)).join('\n\n');
  console.debug('[Shoalrun analytics]', event);
}
