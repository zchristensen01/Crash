/**
 * CHARTS — Canvas 2D, no library.
 * The whole need is a few line series and one scatter. A CDN chart library
 * would also be blocked by the artifact CSP, so this is both lighter and the
 * only option.
 */

export const CHART_COLORS = {
  ink: '#e6e8ee', muted: '#8b93a7', line: '#262b36',
  series: '#6ea8fe', ghost: '#4b5468',
  ok: '#4a9d7f', warn: '#c9a227', danger: '#c25450',
};

/**
 * Size a canvas to its CSS box at device resolution and return a context
 * already scaled, so everything below can draw in CSS pixels.
 * Without the devicePixelRatio step this is blurry on every laptop made
 * since about 2016.
 */
export function fitCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function projector(range, w, h, pad, count) {
  const [lo, hi] = range;
  const span = hi - lo || 1;
  return {
    x: (i) => pad.l + (count <= 1 ? 0 : (i / (count - 1)) * (w - pad.l - pad.r)),
    y: (v) => h - pad.b - ((Math.max(lo, Math.min(hi, v)) - lo) / span) * (h - pad.t - pad.b),
  };
}

function strokeSeries(ctx, values, p, color, width, dashed) {
  if (!values.length) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  if (dashed) ctx.setLineDash([3, 3]);
  ctx.beginPath();
  values.forEach((v, i) => (i ? ctx.lineTo(p.x(i), p.y(v)) : ctx.moveTo(p.x(i), p.y(v))));
  ctx.stroke();
  ctx.restore();
}

/**
 * Line chart with a shaded danger zone, a labelled reference line, the
 * current value called out, and an optional ghost overlay.
 *
 * The first version drew a bare line on a fixed -3..15 axis, so inflation at
 * 2.5% was a flat line pinned to the bottom of an empty box with no
 * indication of what "good" was. Three things fix that: shade where trouble
 * is, name the line you are trying to sit on, and print the number.
 *
 * @param {{values:number[], ghost?:number[], range:[number,number],
 *          label:string, marker?:number, markerLabel?:string,
 *          danger?:{above?:number, below?:number}, fmt?:Function}} opts
 */
export function drawLine(canvas, opts) {
  const { ctx, w, h } = fitCanvas(canvas);
  const pad = { l: 38, r: 58, t: 18, b: 16 };
  const count = Math.max(opts.values.length, opts.ghost?.length || 0, 2);
  const p = projector(opts.range, w, h, pad, count);
  const [lo, hi] = opts.range;
  const plotL = pad.l, plotR = w - pad.r;

  // Danger zone first, so everything else sits on top of it. A band of colour
  // says "you do not want to be up here" faster than any axis label.
  if (opts.danger?.above !== undefined && opts.danger.above < hi) {
    ctx.fillStyle = 'rgba(194, 84, 80, 0.10)';
    const yTop = p.y(hi), yCut = p.y(opts.danger.above);
    ctx.fillRect(plotL, yTop, plotR - plotL, yCut - yTop);
  }
  if (opts.danger?.below !== undefined && opts.danger.below > lo) {
    ctx.fillStyle = 'rgba(194, 84, 80, 0.10)';
    const yCut = p.y(opts.danger.below), yBot = p.y(lo);
    ctx.fillRect(plotL, yCut, plotR - plotL, yBot - yCut);
  }

  ctx.font = '10px ui-monospace, monospace';
  ctx.strokeStyle = CHART_COLORS.line;
  ctx.lineWidth = 1;
  ctx.fillStyle = CHART_COLORS.muted;
  ctx.textAlign = 'right';
  for (const v of [lo, hi]) {
    const y = Math.round(p.y(v)) + 0.5;
    ctx.beginPath(); ctx.moveTo(plotL, y); ctx.lineTo(plotR, y); ctx.stroke();
    ctx.fillText(v.toFixed(0), plotL - 5, y + 3);
  }

  // Year gridlines, so the horizontal axis means something.
  ctx.strokeStyle = 'rgba(38,43,54,0.7)';
  for (let m = 12; m < count; m += 12) {
    const x = Math.round(p.x(m)) + 0.5;
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke();
  }

  // The reference line, NAMED. An unlabelled dashed line is a mystery.
  if (opts.marker !== undefined && opts.marker >= lo && opts.marker <= hi) {
    const y = Math.round(p.y(opts.marker)) + 0.5;
    ctx.save();
    ctx.strokeStyle = CHART_COLORS.warn;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(plotL, y); ctx.lineTo(plotR, y); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = CHART_COLORS.warn;
    ctx.textAlign = 'left';
    ctx.fillText(opts.markerLabel || 'target', plotR + 4, y + 3);
  }

  if (opts.ghost?.length) strokeSeries(ctx, opts.ghost, p, CHART_COLORS.ghost, 1, true);
  strokeSeries(ctx, opts.values, p, opts.color || CHART_COLORS.series, 1.9, false);

  // The current value, at the end of its own line.
  const last = opts.values[opts.values.length - 1];
  if (last !== undefined) {
    const y = p.y(last);
    ctx.beginPath();
    ctx.fillStyle = opts.color || CHART_COLORS.series;
    ctx.arc(p.x(opts.values.length - 1), y, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.font = '11px ui-monospace, monospace';
    ctx.fillText((opts.fmt || ((v) => v.toFixed(1)))(last), plotR + 4, y + 4);
  }

  ctx.fillStyle = CHART_COLORS.muted;
  ctx.font = '10px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(opts.label, plotL, 12);
}

/** Inline sparkline for a gauge row. Same data, no axes, no labels. */
export function drawSparkline(canvas, values, range, color) {
  const { ctx, w, h } = fitCanvas(canvas);
  if (values.length < 2) return;
  const p = projector(range, w, h, { l: 1, r: 1, t: 2, b: 2 }, values.length);
  strokeSeries(ctx, values, p, color || CHART_COLORS.series, 1.25, false);
}

/**
 * The regime quadrant: inflation against the output gap, a dot for now, and a
 * fading trail of the last two years.
 *
 * THE TRAIL IS THE POINT. It shows the direction you are travelling, which is
 * what decides whether a hike is late or early. A static label can only tell
 * you where you are, which is the less useful half.
 */
export function drawRegimeScatter(canvas, history) {
  const { ctx, w, h } = fitCanvas(canvas);
  const pad = { l: 26, r: 8, t: 8, b: 18 };
  const GAP = 6, INF = 12;                 // axis half-ranges
  const x = (g) => pad.l + ((Math.max(-GAP, Math.min(GAP, g)) + GAP) / (2 * GAP)) * (w - pad.l - pad.r);
  const y = (i) => h - pad.b - ((Math.max(-2, Math.min(INF, i)) + 2) / (INF + 2)) * (h - pad.t - pad.b);

  // Quadrant split at zero gap and the 3% inflation line.
  ctx.strokeStyle = CHART_COLORS.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(x(0)) + 0.5, pad.t); ctx.lineTo(Math.round(x(0)) + 0.5, h - pad.b);
  ctx.moveTo(pad.l, Math.round(y(3)) + 0.5); ctx.lineTo(w - pad.r, Math.round(y(3)) + 0.5);
  ctx.stroke();

  ctx.fillStyle = CHART_COLORS.muted;
  ctx.font = '9px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('RECESSION', pad.l + 3, h - pad.b - 4);
  ctx.fillText('STAGFLATION', pad.l + 3, pad.t + 10);
  ctx.textAlign = 'right';
  ctx.fillText('GOLDILOCKS', w - pad.r - 3, h - pad.b - 4);
  ctx.fillText('OVERHEATING', w - pad.r - 3, pad.t + 10);

  const gaps = history.output_gap.slice(-24);
  const infl = history.inflation.slice(-24);
  const n = Math.min(gaps.length, infl.length);
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / n;
    ctx.beginPath();
    ctx.fillStyle = i === n - 1 ? CHART_COLORS.ink : CHART_COLORS.series;
    ctx.globalAlpha = i === n - 1 ? 1 : 0.12 + 0.5 * t;
    ctx.arc(x(gaps[i]), y(infl[i]), i === n - 1 ? 4 : 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
