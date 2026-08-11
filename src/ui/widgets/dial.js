/**
 * DIAL — a slider, plus the two things that make it legible: which way is
 * which, and where "doing nothing" sits.
 *
 * A bare slider between 0 and 20 tells a beginner nothing. Every dial here
 * carries the direction of travel in words, a marker at neutral, and a live
 * readout of how far from neutral you currently are.
 */
import { define } from '../../game/glossary.js';
import { explain } from './tooltip.js';

/** What moving each dial actually does, in the player's language. */
const ENDS = {
  policy_rate: ['cheaper money', 'costlier money'],
  tax_rate: ['people keep more', 'government takes more'],
  govt_spending: ['government spends less', 'government spends more'],
  money_printed: ['borrow it', 'print it'],
  qe: ['no bond buying', 'buy more bonds'],
};

export function mountDial(mount, props) {
  const d = props.dial;
  const wrap = document.createElement('div');
  wrap.className = 'dial';
  wrap.innerHTML = `
    <div class="dial-head">
      <span class="dial-label"></span>
      <output class="dial-value"></output>
    </div>
    <div class="dial-track">
      <input type="range" class="dial-input">
      <i class="dial-neutral"></i>
    </div>
    <div class="dial-ends"><span class="dial-lo"></span><span class="dial-hi"></span></div>
    <p class="dial-stance"></p>`;
  mount.appendChild(wrap);

  const label = wrap.querySelector('.dial-label');
  const value = wrap.querySelector('.dial-value');
  const input = wrap.querySelector('.dial-input');
  const neutral = wrap.querySelector('.dial-neutral');
  const stance = wrap.querySelector('.dial-stance');

  label.textContent = d.label;
  explain(wrap, define(d.label) || d.help);
  Object.assign(input, { min: d.min, max: d.max, step: d.step });
  input.setAttribute('aria-label', `${d.label}, ${d.unit}`);

  const ends = ENDS[d.key] || ['less', 'more'];
  wrap.querySelector('.dial-lo').textContent = `← ${ends[0]}`;
  wrap.querySelector('.dial-hi').textContent = `${ends[1]} →`;

  // The NEUTRAL marker. Without it you cannot tell whether 3% is loose or
  // tight, which is the first thing you need to know before touching it.
  neutral.style.left = `${((d.neutral - d.min) / (d.max - d.min)) * 100}%`;
  neutral.dataset.tip = `Neutral is ${d.neutral}% — ` +
    'this setting neither speeds the economy up nor slows it down.';

  let dragging = false;
  const fmt = (v) => `${v.toFixed(2)}%`;      // every dial is a percentage

  input.addEventListener('input', () => {
    dragging = true;
    value.textContent = fmt(Number(input.value));
    describe(Number(input.value), true);
  });
  const commit = () => {
    if (!dragging) return;
    dragging = false;
    props.onChange(d.key, Number(input.value));
  };
  // Commit on release, not on every pixel — one drag would otherwise queue
  // dozens of tiny effects into the lag pipeline.
  input.addEventListener('change', commit);
  input.addEventListener('pointerup', commit);

  function describe(v, pending) {
    const off = v - d.neutral;
    const word = Math.abs(off) < 0.01 ? 'at neutral'
      : `${Math.abs(off).toFixed(2)}pp ${off > 0 ? 'above' : 'below'} neutral`;
    stance.textContent = pending ? `${word} — release to commit` : word;
    wrap.dataset.stance = Math.abs(off) < 0.01 ? 'neutral' : off > 0 ? 'tight' : 'loose';
  }

  return {
    update(state) {
      if (dragging) return;                 // never fight the player's hand
      const v = state[d.key];
      input.value = String(v);
      value.textContent = fmt(v);
      describe(v, false);
    },
  };
}
