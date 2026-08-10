/**
 * SEEDED RANDOMNESS. Ghost runs, same-seed restarts and determinism tests
 * all depend on this. A stray Math.random destroys all three silently.
 */

/** mulberry32 — identical output in Node and every browser. */
export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seed the player can read off the screen and type back in. */
export function newSeed(rng) {
  return Math.floor(rng() * 100000);
}

/** Bernoulli draw. `monthlyProb` must already be monthly — see units.js. */
export function chance(rng, monthlyProb) {
  return rng() < monthlyProb;
}
