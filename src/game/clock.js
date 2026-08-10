/**
 * THE CLOCK — fixed timestep, decoupled from the render frame.
 * WHO WRITES THIS: you.
 */

/** Wall-clock ms per simulated month, by speed setting. */
export const SPEEDS = { paused: Infinity, '1x': 2000, '3x': 700, '10x': 200 };

/**
 * Accumulator loop.
 * @param {Object} opts { onTick, onRender, getSpeed }
 * @returns {{start:Function, stop:Function}}
 *
 * Accumulate elapsed ms, run onTick once per whole msPerTick, render once per
 * frame. SPEED CHANGES THE WALL-CLOCK RATE ONLY — it never changes the math,
 * and one tick is always one month.
 *
 * CLAMP the accumulator (~5 ticks max per frame). Background a tab for a
 * minute and an unclamped loop will run 30 ticks in one frame and the player
 * returns to a country that collapsed while they were reading email.
 *
 * Auto-pause on: any event firing, any gauge entering a danger band, any
 * ending condition starting its countdown.
 */
export function makeClock(opts) {
  throw new Error('clock.makeClock: not implemented');
}
