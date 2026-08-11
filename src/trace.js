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
      const values = Object.values(terms);
      const sum = values.reduce((a, b) => a + b, 0);
      // THE TOLERANCE IS RELATIVE ABOVE 1e6, and absolute below it.
      //
      // An absolute 1e-6 is the right check at the magnitudes an economy
      // actually reaches, and it stays exactly that strict there: 1e-12 of a
      // term of size 100 is 1e-10, far below the floor. But a run left going
      // in a divergent regime reaches terms of ~1e17, where a double has
      // about 1e1 of resolution — so two terms that cancel to a total of 2
      // cannot agree to 1e-6 no matter how correct the arithmetic is, and the
      // guard fires on floating point rather than on a bug. Measured: this
      // tripped in `debt_trap` at month 189, 115 months after the debt-crisis
      // ending would have ended a real game at month 74.
      const scale = Math.max(Math.abs(total), ...values.map(Math.abs));
      if (Math.abs(sum - total) > Math.max(1e-6, 1e-12 * scale)) {
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
