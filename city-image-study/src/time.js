// Visibility callbacks can run after a RAF timestamp was sampled.
export const frameDelta = milliseconds => Number.isFinite(milliseconds) ? Math.max(0, Math.min(.05, milliseconds / 1000)) : 0;
export const loopPhase = value => Number.isFinite(value) ? ((value % 1) + 1) % 1 : 0;
