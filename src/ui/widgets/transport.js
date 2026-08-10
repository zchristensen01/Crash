/**
 * TRANSPORT — play/pause, speed, and how far through the term you are.
 *
 * Play/pause and speed are SEPARATE controls. Rolling them into one row of
 * four buttons (paused / 1x / 3x / 10x) meant the paused state looked like a
 * speed, there was never a visible play button, and pausing silently threw
 * away your speed choice.
 *
 * The button shows the ACTION IT WILL PERFORM, not the current state — a
 * media convention people already know. Paused shows ▶.
 */
export function mountTransport(mount, props) {
  const wrap = document.createElement('div');
  wrap.className = 'transport';
  wrap.innerHTML = `
    <button class="play" type="button"></button>
    <span class="speeds"></span>
    <span class="term">
      <span class="term-bar"><i></i></span>
      <span class="term-text"></span>
    </span>`;
  mount.appendChild(wrap);

  const play = wrap.querySelector('.play');
  const speeds = wrap.querySelector('.speeds');
  const bar = wrap.querySelector('.term-bar i');
  const text = wrap.querySelector('.term-text');

  play.addEventListener('click', () => props.onTogglePlay());
  play.dataset.tip = 'Start and stop time. Everything happens on a delay, so ' +
    'pausing to think is a normal part of the job, not cheating.';

  const speedButtons = props.speeds.map((name) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = name;
    b.dataset.tip = { '1x': 'One month every 2 seconds.',
                      '3x': 'One month every 0.7 seconds.',
                      '10x': 'One month every 0.2 seconds — for cruising through calm years.' }[name];
    b.addEventListener('click', () => props.onSpeed(name));
    speeds.appendChild(b);
    return { name, el: b };
  });

  return {
    update(session, termMonths) {
      const done = !!session.over;
      play.textContent = done ? '■' : session.playing ? '❚❚' : '▶';
      play.dataset.state = done ? 'done' : session.playing ? 'playing' : 'paused';
      play.disabled = done;
      play.setAttribute('aria-label', session.playing ? 'Pause' : 'Play');

      for (const b of speedButtons) b.el.dataset.active = String(b.name === session.speed);

      const frac = Math.min(1, session.state.tick / termMonths);
      bar.style.width = `${frac * 100}%`;
      text.textContent = `${session.state.tick} / ${termMonths} months`;
    },
  };
}
