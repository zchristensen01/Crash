/**
 * THE LAG PIPELINE — the mechanic AND the lesson.
 */
import { kernelFor, peakMonth } from './kernels.js';

export class LagPipeline {
  constructor() { this.items = []; }

  /** @param {number} amount TOTAL effect across the whole kernel. */
  schedule(target, amount, channel, label, nowTick) {
    if (amount === 0) return;
    this.items.push({ target, amount, channel, label, start: nowTick,
                      weights: kernelFor(channel) });
  }

  /** Effects landing this tick. Called once per tick by the engine. */
  collect(nowTick) {
    const out = {};
    for (const it of this.items) {
      const age = nowTick - it.start;              // 0 = the tick it was set
      const w = it.weights[age];
      if (w === undefined) continue;
      out[it.target] = (out[it.target] || 0) + it.amount * w;
    }
    // Drop exhausted items so the queue can't grow without bound.
    this.items = this.items.filter((it) => nowTick - it.start < it.weights.length - 1);
    return out;
  }

  /** For the pipeline panel. Negative monthsToPeak means past peak, still landing. */
  pending(nowTick) {
    return this.items.map((it) => {
      const age = nowTick - it.start;
      let landed = 0;
      for (let i = 0; i <= age && i < it.weights.length; i++) landed += it.weights[i];
      return {
        label: it.label, target: it.target,
        monthsToPeak: peakMonth(it.channel) - age,
        fractionLanded: landed, totalAmount: it.amount,
      };
    }).filter((p) => p.fractionLanded < 0.995);
  }
}
