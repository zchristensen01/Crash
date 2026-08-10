/**
 * GAUGE widget — one indicator row: label, value, bar, sparkline, verdict.
 * Generated from INDICATORS in src/game/indicators.js; adding a gauge there
 * must never require editing this file.
 * WHO WRITES THIS: you.
 */

/**
 * @param {HTMLElement} mount @param {Object} props { indicator, state, ghost }
 * @returns {{update:Function}}
 *
 * The verdict is plain English — "running hot", "CRISIS" — because a number
 * alone teaches nothing to someone starting from zero. Never rely on colour
 * alone to signal a danger band; pair it with the word.
 *
 * The whole row is clickable and opens the `why` panel for that variable.
 */
export function mountGauge(mount, props) {
  throw new Error('gauge.mountGauge: not implemented');
}
