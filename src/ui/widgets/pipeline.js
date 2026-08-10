/**
 * PIPELINE — THE MOST IMPORTANT WIDGET ON SCREEN.
 *
 * A live queue of what you have done that has not landed yet. Without it
 * players conclude the model is broken; with it they learn to plan ahead.
 */

export function mountPipeline(mount, props) {
  const list = document.createElement('div');
  list.className = 'pipeline-list';
  const empty = document.createElement('p');
  empty.className = 'pipeline-empty';
  empty.textContent = 'Nothing in flight. Move a dial and watch it queue here.';
  mount.append(list, empty);

  return {
    update(pending) {
      empty.hidden = pending.length > 0;
      list.innerHTML = '';
      for (const p of pending) {
        const row = document.createElement('div');
        row.className = 'pipe';
        // A negative countdown means past peak but still arriving. Show that
        // rather than hiding it — the tail is the part players consistently
        // underestimate, and it is why overshooting a hike takes years to undo.
        const when = p.monthsToPeak > 0
          ? `peaks in ${p.monthsToPeak} mo`
          : p.monthsToPeak === 0 ? 'peaking now' : 'still landing';
        row.innerHTML = `
          <span class="pipe-label"></span>
          <span class="pipe-target"></span>
          <span class="pipe-bar"><i style="width:${(p.fractionLanded * 100).toFixed(1)}%"></i></span>
          <span class="pipe-when"></span>`;
        row.querySelector('.pipe-label').textContent = p.label;
        row.querySelector('.pipe-target').textContent = `→ ${p.target}`;
        row.querySelector('.pipe-when').textContent = when;
        row.dataset.state = p.monthsToPeak > 0 ? 'waiting' : 'landing';
        list.appendChild(row);
      }
    },
  };
}
