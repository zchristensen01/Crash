/**
 * WHY PANEL — the thing that makes this a teaching tool instead of a toy.
 * WHO WRITES THIS: you.
 */

/**
 * Click any number on screen -> open the terms that produced it, as a
 * waterfall, each with its own contribution.
 * @param {HTMLElement} mount @param {Object} props { trace, key }
 * @returns {{update:Function}}
 *
 * THE TERMS MUST VISIBLY SUM TO THE TOTAL. Show the running total. If they
 * don't add up, that is a bug in the rule, not in this widget — the prototype
 * computed one term after mutating the state it described, and a `why` panel
 * whose numbers don't add up is worse than none.
 *
 * Show each term's parameter provenance on hover: confidence level and
 * citation, straight from params.js. Where confidence is weak or contested,
 * show the RANGE rather than the point. That honesty is a feature of the
 * project, not a caveat to bury.
 */
export function mountWhy(mount, props) {
  throw new Error('why.mountWhy: not implemented');
}
