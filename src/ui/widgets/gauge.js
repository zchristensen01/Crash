/**
 * GAUGE — one indicator: value, bar, trend, sparkline, verdict.
 * Generated from INDICATORS; adding a gauge there never touches this file.
 */
import { drawSparkline, CHART_COLORS } from '../chart.js';
import { define } from '../../game/glossary.js';
import { explain } from './tooltip.js';

/** Months back to compare against when deciding if something is deteriorating. */
const TREND_WINDOW = 6;

export function mountGauge(mount, props) {
  const ind = props.indicator;
  const row = document.createElement('button');
  row.className = 'gauge';
  row.type = 'button';
  row.setAttribute('aria-label', `${ind.label} — open the numbers behind it`);
  row.innerHTML = `
    <span class="gauge-label"></span>
    <span class="gauge-value"></span>
    <span class="gauge-trend"></span>
    <span class="gauge-bar"><i></i></span>
    <canvas class="gauge-spark" width="64" height="20"></canvas>
    <span class="gauge-verdict"></span>`;
  mount.appendChild(row);

  const el = {
    label: row.querySelector('.gauge-label'),
    value: row.querySelector('.gauge-value'),
    trend: row.querySelector('.gauge-trend'),
    fill: row.querySelector('.gauge-bar i'),
    spark: row.querySelector('.gauge-spark'),
    verdict: row.querySelector('.gauge-verdict'),
  };
  el.label.textContent = ind.label;
  explain(row, define(ind.label) || ind.help);

  row.addEventListener('click', () => props.onOpenWhy?.(ind));

  return {
    update(state) {
      const v = ind.get(state);

      // Some numbers are not meaningful yet — growth needs a full year before
      // year-over-year means anything. Say so rather than printing a zero and
      // calling it a recession.
      if (!Number.isFinite(v)) {
        el.value.textContent = '—';
        el.verdict.textContent = 'gathering data';
        el.trend.textContent = '·';
        el.fill.style.width = '0%';
        row.dataset.band = 'ok';
        row.dataset.trend = 'flat';
        return;
      }

      const [lo, hi] = ind.range;
      const band = ind.band(v);
      const frac = Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1)));
      const hist = state.history[ind.historyKey] || [];

      el.value.textContent = ind.fmt(v);
      el.fill.style.width = `${frac * 100}%`;
      row.dataset.band = band;
      el.verdict.textContent = ind.verdict(v);

      // DIRECTION, not just level. A gauge sitting in the amber band and
      // improving is a different situation from the same gauge deteriorating,
      // and the level alone cannot tell you which you are in.
      let dir = 0;
      if (hist.length > TREND_WINDOW) {
        const then = hist[hist.length - 1 - TREND_WINDOW];
        const delta = ind.badness(v) - ind.badness(then);
        if (Math.abs(delta) > (ind.trendEpsilon ?? 0.05)) dir = delta > 0 ? 1 : -1;
      }
      row.dataset.trend = dir === 1 ? 'worse' : dir === -1 ? 'better' : 'flat';
      el.trend.textContent = dir === 1 ? '▲' : dir === -1 ? '▼' : '·';
      el.trend.title = dir === 1 ? 'getting worse' : dir === -1 ? 'improving' : 'steady';

      if (hist.length > 1) {
        drawSparkline(el.spark, hist.slice(-60), ind.range,
          band === 'danger' ? CHART_COLORS.danger
            : band === 'warn' ? CHART_COLORS.warn : CHART_COLORS.ok);
      }
    },
  };
}
