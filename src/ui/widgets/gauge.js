/**
 * GAUGE — one indicator row: label, value, bar, sparkline, verdict.
 * Generated from INDICATORS; adding a gauge there never touches this file.
 */
import { drawSparkline, CHART_COLORS } from '../chart.js';

export function mountGauge(mount, props) {
  const ind = props.indicator;
  const row = document.createElement('button');
  row.className = 'gauge';
  row.type = 'button';
  // The whole row opens the `why` panel. Making it a real <button> means it
  // is keyboard reachable, which a clickable <div> would not be.
  row.setAttribute('aria-label', `${ind.label} — open the numbers behind it`);
  row.innerHTML = `
    <span class="gauge-label"></span>
    <span class="gauge-value"></span>
    <span class="gauge-bar"><i></i></span>
    <canvas class="gauge-spark" width="60" height="18"></canvas>
    <span class="gauge-verdict"></span>`;
  mount.appendChild(row);

  const el = {
    label: row.querySelector('.gauge-label'),
    value: row.querySelector('.gauge-value'),
    fill: row.querySelector('.gauge-bar i'),
    spark: row.querySelector('.gauge-spark'),
    verdict: row.querySelector('.gauge-verdict'),
  };
  el.label.textContent = ind.label;
  row.title = ind.help;
  row.addEventListener('click', () => props.onOpenWhy?.(ind));

  return {
    update(state, ghost) {
      const v = ind.get(state);
      const [lo, hi] = ind.range;
      const band = ind.band(v);
      const frac = Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1)));

      el.value.textContent = ind.fmt(v);
      el.fill.style.width = `${frac * 100}%`;
      row.dataset.band = band;
      // Colour is never the only signal — the verdict word carries it too.
      el.verdict.textContent = ind.verdict(v);

      const hist = state.history[ind.historyKey] || [];
      if (hist.length > 1) {
        drawSparkline(el.spark, hist.slice(-60), ind.range,
          band === 'danger' ? CHART_COLORS.danger
            : band === 'warn' ? CHART_COLORS.warn : CHART_COLORS.ok);
      }
    },
  };
}
