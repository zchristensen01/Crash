/**
 * TRACE — the why panel's data source.
 * THE ONE NON-NEGOTIABLE RULE: no rule may modify state without recording why.
 */

export class Trace {
  constructor(strict = true) {
    this.entries = new Map();
    this.strict = strict;
  }

  /**
   * @param {string} key the state variable this explains
   * @param {Object<string,number>} terms plain-English label -> contribution
   * @param {number} total the value that resulted
   * @param {Object} [extra] context that is NOT a summand (e.g. the kappa used)
   *
   * In strict mode the terms must sum to the total. The prototype computed a
   * term after mutating the state it described, so its `why` panel didn't add
   * up — which is worse than having none. This assertion is what stops that.
   */
  record(key, terms, total, extra) {
    if (this.strict) {
      const sum = Object.values(terms).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - total) > 1e-6) {
        throw new Error(
          `trace: terms for '${key}' sum to ${sum}, but total is ${total}. ` +
          `Record the terms BEFORE mutating the state they describe.`);
      }
    }
    this.entries.set(key, { terms, total, extra });
  }

  /** For values with no additive decomposition (switches, regimes). */
  note(key, extra) {
    this.entries.set(key, { terms: {}, total: null, extra });
  }

  get(key) { return this.entries.get(key); }
  reset() { this.entries.clear(); }
}
