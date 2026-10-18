// Shared by build-time documentation and browser behavior. No DOM dependencies.
export function validatePolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new Error('policy must be an object');
  const { attempts, baseDelayMs, maxDelayMs, backoff, jitter, retryableStatuses, warning } = policy;
  if (Object.keys(policy).some(key => !['attempts', 'baseDelayMs', 'maxDelayMs', 'backoff', 'jitter', 'retryableStatuses', 'warning'].includes(key))) throw new Error('policy has an unknown field');
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 8) throw new Error('attempts must be an integer from 1 to 8, including the first attempt');
  if (!Number.isInteger(baseDelayMs) || baseDelayMs < 1 || baseDelayMs > 60000) throw new Error('baseDelayMs must be an integer from 1 to 60000');
  if (!Number.isInteger(maxDelayMs) || maxDelayMs < baseDelayMs || maxDelayMs > 60000) throw new Error('maxDelayMs must be between baseDelayMs and 60000');
  if (!['constant', 'exponential'].includes(backoff) || !['none', 'full'].includes(jitter)) throw new Error('backoff must be constant or exponential; jitter must be none or full');
  if (!Array.isArray(retryableStatuses) || !retryableStatuses.length || new Set(retryableStatuses).size !== retryableStatuses.length || retryableStatuses.some(status => !Number.isInteger(status) || status < 400 || status > 599)) throw new Error('retryableStatuses needs distinct HTTP error status codes');
  if (typeof warning !== 'string' || !warning.trim()) throw new Error('policy needs a nonempty warning');
  return policy;
}
export function retrySchedule(policy) {
  validatePolicy(policy);
  let total = 0;
  return Array.from({ length: policy.attempts }, (_, index) => {
    const delay = index === 0 ? 0 : Math.min(policy.maxDelayMs, policy.baseDelayMs * (policy.backoff === 'constant' ? 1 : 2 ** (index - 1)));
    total += delay;
    return { attempt: index + 1, delay, total };
  });
}
