/**
 * UNITS — the only place a time conversion may happen.
 *
 * The model ticks monthly; almost every published estimate is quarterly or
 * annual. Two conversions exist and picking the wrong one is the classic
 * macro modelling bug.
 *
 * WHICH TO USE:
 *   COMPOUND  for anything that grows on itself and is DISPLAYED as a rate:
 *             inflation, real growth, asset returns.
 *   LINEAR    for flows measured as a share of annual GDP, and for the stock
 *             accounting: deficit, spending, revenue, depreciation, the debt
 *             erosion term.
 *
 * WHY THE STOCKS USE LINEAR. It looks like the sloppier choice; it is the
 * exact one. The steady-state identities in parameters.py §2 are written in
 * the linear convention — I/Y = (delta + g)*K/Y, deficit = debt*g. Using
 * compounding for the monthly slices of those makes the discrete monthly
 * system's fixed point sit slightly off the documented steady state, and the
 * model drifts. The residual is ~0.5% of the investment share, well inside
 * DEPRECIATION_RATE's own range of 0.04-0.10, so nothing is lost.
 * test/steady-state.test.js is what holds this honest.
 */

/** Compounding annual percent -> monthly fraction. 3.5%/yr -> 0.002871/mo. */
export function annualToMonthlyCompound(annualPct) {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

/** Monthly fraction -> annualised percent. Inverse of the above. */
export function monthlyToAnnualCompound(monthlyFrac) {
  return (Math.pow(1 + monthlyFrac, 12) - 1) * 100;
}

/** Linear annual flow -> this month's slice. Same units in and out. */
export function annualToMonthlyFlow(annualPct) {
  return annualPct / 12;
}

/** Linear annual rate -> monthly fraction, for stock accounting. */
export function annualRateToMonthlyLinear(annualFrac) {
  return annualFrac / 12;
}

/**
 * Quarterly -> monthly.
 * @param {boolean} compounds true for adjustment SPEEDS and anything growing
 *   on itself. A quarterly speed s is 1-(1-s)^(1/3) monthly, NOT s/3 —
 *   closing 35% of a gap per quarter is 13.4% per month, not 11.7%.
 */
export function quarterlyToMonthly(quarterly, compounds) {
  return compounds ? 1 - Math.pow(1 - quarterly, 1 / 3) : quarterly / 3;
}

/** Year-over-year percent change from a level history, oldest first. */
export function yoyGrowth(history) {
  if (history.length < 13) return 0;
  const now = history[history.length - 1];
  const then = history[history.length - 13];
  return then === 0 ? 0 : (now / then - 1) * 100;
}

/** Clamp. Used everywhere; defined once. */
export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** Linear interpolation, t in [0,1]. */
export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Annual probability -> monthly. 1-(1-p)^(1/12), NOT p/12.
 * A 30%/yr crisis probability is 2.9%/month, not 2.5%. Drawing on the annual
 * figure once a month makes a crash ~12x more likely than the research says.
 */
export function annualProbToMonthly(annualPct) {
  const p = clamp(annualPct / 100, 0, 1);
  return 1 - Math.pow(1 - p, 1 / 12);
}
