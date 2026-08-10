/**
 * CHARTS — Canvas 2D, no library.
 * The whole charting need is a few line series and one scatter: roughly 120
 * lines. A CDN chart library is also blocked by the artifact CSP, so this is
 * both the lighter and the only option.
 * WHO WRITES THIS: you. Self-contained, no economics.
 */

/**
 * Line chart with optional ghost overlay.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} opts { series, ghost, range, bands, label }
 *
 * `ghost` is the previous run on the same seed, drawn faint BEHIND the
 * current line. It is the feature that turns a restart into an experiment.
 *
 * Handle devicePixelRatio or it is blurry on every laptop made since 2016.
 */
export function drawLine(canvas, opts) {
  throw new Error('chart.drawLine: not implemented');
}

/** Inline sparkline for a gauge row. Same data, no axes, no labels. */
export function drawSparkline(canvas, values, range) {
  throw new Error('chart.drawSparkline: not implemented');
}

/**
 * The regime quadrant: inflation vs output gap, a dot for now, and a fading
 * trail of the last 24 months. The TRAIL is the point — it shows the
 * direction you are travelling, which is what decides whether a hike is late
 * or early. A static label can only tell you where you are.
 */
export function drawRegimeScatter(canvas, history) {
  throw new Error('chart.drawRegimeScatter: not implemented');
}
