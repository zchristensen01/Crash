/**
 * THE CLOCK — fixed timestep, decoupled from the render frame.
 *
 * Speed changes the wall-clock rate only. It never changes the math, and one
 * tick is always one month. A model whose results depend on your frame rate
 * is not a model.
 */

/** Wall-clock milliseconds per simulated month, by speed setting. */
export const SPEEDS = { paused: Infinity, '1x': 2000, '3x': 700, '10x': 200 };
export const SPEED_ORDER = ['paused', '1x', '3x', '10x'];

/** Never simulate more than this many months in one frame. */
const MAX_CATCHUP = 5;

/**
 * @param {{onTick:Function, onRender:Function, getSpeed:Function}} opts
 * @returns {{start:Function, stop:Function}}
 *
 * The accumulator is CLAMPED. Background a tab for a minute and an unclamped
 * loop runs thirty months in a single frame — the player comes back to a
 * country that collapsed while they were reading email, with no chance to
 * react. Dropping the backlog is the correct behaviour; catching up is not.
 */
export function makeClock(opts) {
  let raf = null;
  let last = 0;
  let acc = 0;
  let running = false;

  function frame(now) {
    if (!running) return;
    const dt = Math.min(now - last, 1000);
    last = now;

    const msPerTick = SPEEDS[opts.getSpeed()];
    if (Number.isFinite(msPerTick)) {
      acc += dt;
      let n = 0;
      while (acc >= msPerTick && n < MAX_CATCHUP) {
        acc -= msPerTick;
        n += 1;
        if (opts.onTick() === false) { acc = 0; break; }
      }
      if (acc > msPerTick * MAX_CATCHUP) acc = 0;   // drop the backlog
    } else {
      acc = 0;
    }

    opts.onRender();
    raf = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    },
  };
}
