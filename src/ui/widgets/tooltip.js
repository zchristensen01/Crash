/**
 * TOOLTIP — one floating element, shown for anything carrying `data-tip`.
 *
 * A single shared node rather than one per widget: dozens of absolutely
 * positioned hidden divs is both slower and harder to keep on screen.
 *
 * Uses focus as well as hover, so the definitions are reachable by keyboard
 * rather than being mouse-only trivia.
 */
let tipEl = null;

export function installTooltips(root) {
  if (tipEl) return;
  tipEl = document.createElement('div');
  tipEl.className = 'tip';
  tipEl.setAttribute('role', 'tooltip');
  tipEl.hidden = true;
  document.body.appendChild(tipEl);

  const show = (target) => {
    const text = target?.dataset?.tip;
    if (!text) return;
    tipEl.textContent = text;
    tipEl.hidden = false;
    const r = target.getBoundingClientRect();
    const w = 320;
    tipEl.style.width = `${w}px`;
    // Flip to the left when the anchor is near the right edge, and above when
    // near the bottom, so the definition never lands off screen.
    const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    tipEl.style.left = `${left}px`;
    const below = r.bottom + 8;
    if (below + 120 > window.innerHeight) {
      tipEl.style.top = `${Math.max(8, r.top - 8 - tipEl.offsetHeight)}px`;
    } else {
      tipEl.style.top = `${below}px`;
    }
  };
  const hide = () => { tipEl.hidden = true; };

  const find = (el) => (el?.closest ? el.closest('[data-tip]') : null);
  root.addEventListener('mouseover', (e) => show(find(e.target)));
  root.addEventListener('mouseout', hide);
  root.addEventListener('focusin', (e) => show(find(e.target)));
  root.addEventListener('focusout', hide);
  window.addEventListener('scroll', hide, true);
}

/** Mark an element as explainable. */
export function explain(el, text) {
  if (text) {
    el.dataset.tip = text;
    el.tabIndex = el.tabIndex >= 0 ? el.tabIndex : 0;
  }
  return el;
}
