/**
 * REGIME — the four-quadrant box from docs/02 Part 4, live.
 */
import { drawRegimeScatter } from '../chart.js';
import { regime } from '../../state.js';

export function mountRegime(mount, props) {
  const canvas = document.createElement('canvas');
  canvas.className = 'regime-canvas';
  const caption = document.createElement('p');
  caption.className = 'regime-caption';
  mount.append(canvas, caption);

  return {
    update(state) {
      drawRegimeScatter(canvas, state.history);
      const r = regime(state);
      caption.dataset.regime = r;
      // Three of the four boxes have an answer. One doesn't, and saying so is
      // the most honest thing in the design.
      caption.textContent = {
        GOLDILOCKS: 'GOLDILOCKS — do nothing. Seriously.',
        OVERHEATING: 'OVERHEATING — hike, tighten fiscal, take the pain early.',
        RECESSION: 'RECESSION — cut rates and spend. Both dials point the same way.',
        STAGFLATION: 'STAGFLATION — no good answer. The dials point in opposite directions.',
      }[r];
    },
  };
}
