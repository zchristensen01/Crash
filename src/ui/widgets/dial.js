/**
 * DIAL — a draggable slider. The dials are the game: a control you drag and
 * watch respond is a different object from a number you type, and that
 * difference is most of the reason to leave the terminal.
 */

export function mountDial(mount, props) {
  const d = props.dial;
  const wrap = document.createElement('div');
  wrap.className = 'dial';
  wrap.innerHTML = `
    <label class="dial-label"></label>
    <output class="dial-value"></output>
    <span class="dial-track">
      <input type="range" class="dial-input">
      <i class="dial-neutral"></i>
    </span>`;
  mount.appendChild(wrap);

  const label = wrap.querySelector('.dial-label');
  const value = wrap.querySelector('.dial-value');
  const input = wrap.querySelector('.dial-input');
  const neutral = wrap.querySelector('.dial-neutral');

  label.textContent = d.label;
  wrap.title = d.help;
  Object.assign(input, { min: d.min, max: d.max, step: d.step });
  input.setAttribute('aria-label', `${d.label}, ${d.unit}`);

  // The NEUTRAL marker. Without it a player cannot tell whether 3% is loose
  // or tight, which is the first thing they need to know.
  neutral.style.left = `${((d.neutral - d.min) / (d.max - d.min)) * 100}%`;

  let dragging = false;
  input.addEventListener('input', () => {
    dragging = true;
    value.textContent = `${Number(input.value).toFixed(2)}${d.unit === '%' ? '%' : ''}`;
  });
  const commit = () => {
    if (!dragging) return;
    dragging = false;
    props.onChange(d.key, Number(input.value));
  };
  // Commit on release, not on every pixel of the drag — otherwise a single
  // gesture floods the lag pipeline with dozens of tiny scheduled effects.
  input.addEventListener('change', commit);
  input.addEventListener('pointerup', commit);

  return {
    update(state) {
      if (dragging) return;                 // never fight the player's hand
      const v = state[d.key];
      input.value = String(v);
      value.textContent = `${v.toFixed(2)}${d.unit === '%' ? '%' : ''}`;
      wrap.dataset.stance =
        Math.abs(v - d.neutral) < 0.01 ? 'neutral' : v > d.neutral ? 'tight' : 'loose';
    },
  };
}
