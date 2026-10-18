import React, { useEffect, useId, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { retrySchedule } from './model.js';

function RetryCalculator({ policy }) {
  const id = useId();
  const [attempts, setAttempts] = useState(String(policy.attempts));
  const [base, setBase] = useState(String(policy.baseDelayMs));
  const [cap, setCap] = useState(String(policy.maxDelayMs));
  const [backoff, setBackoff] = useState(policy.backoff);
  const [jitter, setJitter] = useState(policy.jitter);
  const a = Number(attempts), b = Number(base), c = Number(cap);
  let schedule = [];
  let valid = true;
  try { schedule = retrySchedule({ ...policy, attempts: a, baseDelayMs: b, maxDelayMs: c, backoff, jitter }); }
  catch { valid = false; }
  const total = schedule.at(-1)?.total ?? 0;
  const time = value => jitter === 'full' && value ? `0–${value.toLocaleString('en-US')} ms` : `${value.toLocaleString('en-US')} ms`;
  const number = (name, label, value, onChange, min, max) => <label htmlFor={`${id}-${name}`}>{label}<input id={`${id}-${name}`} type="number" min={min} max={max} step="1" value={value} onChange={event => onChange(event.target.value)} aria-describedby={valid ? undefined : `${id}-error`} /></label>;
  return <div className="retry-calculator">
    <div className="retry-calculator-heading"><span className="retry-eyebrow">Interactive example · React</span><h3>Explore a retry budget</h3><p>Change the policy to see how long a client might wait before giving up.</p></div>
    <fieldset><legend>Retry policy</legend><div className="retry-fields">
      {number('attempts', 'Maximum attempts', attempts, setAttempts, 1, 8)}
      {number('base', 'Base delay (ms)', base, setBase, 1, 60000)}
      {number('cap', 'Delay cap (ms)', cap, setCap, Number(base) || 1, 60000)}
      <label htmlFor={`${id}-backoff`}>Backoff<select id={`${id}-backoff`} value={backoff} onChange={event => setBackoff(event.target.value)}><option value="constant">Constant</option><option value="exponential">Exponential</option></select></label>
      <label htmlFor={`${id}-jitter`}>Jitter<select id={`${id}-jitter`} value={jitter} onChange={event => setJitter(event.target.value)}><option value="none">None</option><option value="full">Full jitter</option></select></label>
    </div></fieldset>
    {!valid ? <p id={`${id}-error`} role="alert">Use 1–8 attempts and whole-millisecond delays from 1 to 60000. The cap must be at least the base delay.</p> : <>
      <p className="retry-result" role="status" aria-live="polite"><strong>{time(total)}</strong><span>Total wait budget, excluding request duration and Retry-After.</span></p>
      <ol className="retry-timeline" aria-label="Attempt timeline">{schedule.map(item => <li key={item.attempt}><span>Attempt {item.attempt}</span><span className="retry-track" aria-hidden="true"><span style={{ width: `${Math.max(2, item.delay / Math.max(...schedule.map(row => row.delay), 1) * 100)}%` }} /></span><strong>{time(item.delay)}</strong></li>)}</ol>
      {jitter === 'full' && <p>Full jitter chooses a random wait within each range. Expected total wait: {(total / 2).toLocaleString('en-US')} ms.</p>}
    </>}
    <p className="retry-note">Safety rules, the configured policy, formulas, code, and a worked schedule remain below in both HTML and Markdown.</p>
    <button type="button" onClick={() => { setAttempts(String(policy.attempts)); setBase(String(policy.baseDelayMs)); setCap(String(policy.maxDelayMs)); setBackoff(policy.backoff); setJitter(policy.jitter); }}>Reset to configured policy</button>
  </div>;
}

export function enhance({ root, controls, data: policy }) {
  if (root.dataset.shoalrunComponent !== 'RetryBudget') return;
  return new Promise((resolve, reject) => {
    const app = createRoot(controls, { onUncaughtError: error => { controls.hidden = true; reject(error); } });
    function MountedCalculator() {
      useEffect(() => { controls.hidden = false; resolve(); }, []);
      return <RetryCalculator policy={policy} />;
    }
    // React owns only the initially empty controls slot.
    app.render(<MountedCalculator />);
  });
}
