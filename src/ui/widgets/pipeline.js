/**
 * PIPELINE widget — THE MOST IMPORTANT WIDGET ON SCREEN.
 * A live queue of what you have done that has not landed yet. Without it
 * players conclude the model is broken; with it they learn to plan ahead.
 * WHO WRITES THIS: you.
 */

/**
 * @param {HTMLElement} mount @param {Object} props { pending, tick }
 * @returns {{update:Function}}
 *
 * One row per queued effect: plain-English label, what it hits, a fill bar
 * for the share already landed, and a countdown to peak.
 *
 *   rate +0.50pp   → investment   ▓▓▓▓▓░░░░ peaks in 3 months
 *
 * Rows should slide toward the present and flash on landing. Keep an effect
 * visible through its tail, not just to its peak — the tail is the part
 * players consistently underestimate, and the reason overshooting a hike
 * takes years to undo.
 */
export function mountPipeline(mount, props) {
  throw new Error('pipeline.mountPipeline: not implemented');
}
