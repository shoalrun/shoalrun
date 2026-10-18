// The chat's instant off switch, kept in the same store as the daily counters so it takes effect within seconds and needs no redeploy.
// A running function checks the flag at most every five seconds. `shoalrun chat pause` sets it and `shoalrun chat resume` clears it.
export const pausedKey = 'shoalrun:chat:paused';
