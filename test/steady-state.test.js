/**
 * THE MILESTONE TEST. Do not proceed past it.
 *
 * A model that will not sit still is unplayable, and every bug you find later
 * will be this bug. The prototype failed this: left alone it drifted to a
 * permanent +0.6% output gap and a 12pp credit gap — past the BIS danger line,
 * with the player asleep, which destroyed the Bubble scenario.
 *
 * WHO WRITES THIS: you (the harness). It fails until the rules exist.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState } from '../src/state.js';
import { run } from '../src/engine.js';

// events: false — 'no input' means no shocks either, or this measures luck.
const QUIET = { events: false };

const TOLERANCE = {
  output_gap: 0.01,        // pp
  credit_to_gdp_gap: 0.05, // pp — the prototype reached 12
  inflation: 0.02,
  unemployment: 0.02,
  govt_debt: 0.5,
};

// Credibility is deliberately NOT in that list. 200 months of on-target
// inflation SHOULD build trust — that is the model working, not drift. It is
// asserted separately below, and it disturbs nothing else because kappa only
// multiplies the output gap, which is zero at rest.

test('200 ticks of no input and nothing drifts', () => {
  const s = newState();
  const start = { ...s };
  run(s, 200, QUIET);
  for (const [key, tol] of Object.entries(TOLERANCE)) {
    assert.ok(Math.abs(s[key] - start[key]) < tol,
      `${key} drifted from ${start[key]} to ${s[key]} over 200 ticks ` +
      `(tolerance ${tol}). The model has no equilibrium to sit at.`);
  }
});

/**
 * THE LEVEL, NOT THE RATIO — AND THIS TEST FILE COULD NOT SEE IT [4th audit 5.7].
 *
 * Every quantity in TOLERANCE above is a ratio, a rate, or a percent of
 * potential. `output_gap` is output OVER potential. `consumption` is a percent
 * OF potential. `inflation` and `unemployment` are rates. **All of them are
 * invariant to output and potential drifting together**, so the milestone test
 * — the one this file opens by calling load-bearing — was blind to an entire
 * class of defect for the life of the model.
 *
 * It was blind to a real one. `supply.js` added `s.investment`, a PERCENT OF
 * POTENTIAL, to `capital_stock`, a LEVEL, so the investment flow feeding the
 * capital stock was frozen at its month-zero value while potential grew away
 * from 100. Measured before the fix: K/Y fell 3.0 → 2.89 (m96) → 2.05 (m600),
 * K converged to a constant `I/δ` = 346.15, and long-run potential growth
 * decayed to 0.93%/yr against a stated 1.5. Nothing in this file moved.
 *
 * So: assert the two LEVEL facts a growth model must satisfy at rest, both
 * derived rather than pinned. The economy grows at the rate it says it grows
 * at, and the capital-output ratio it was built around stays put.
 */
test('THE LEVEL: potential grows at potential_growth, and K/Y stays put', () => {
  const s = newState();
  const kOverY0 = s.capital_stock / s.potential_output;
  run(s, 200, QUIET);

  // 1. Realised growth equals the stated rate. The residual is the linear-vs-
  //    compound convention units.js documents, which is ~0.7% of the rate.
  const realised = s.gdp_growth_annual;
  assert.ok(Math.abs(realised - s.potential_growth) < 0.05,
    `the economy grew at ${realised.toFixed(4)}%/yr against a potential_growth ` +
    `of ${s.potential_growth}%. Output and potential can drift TOGETHER without ` +
    `moving a single ratio above, which is how the capital-units defect of 5.7 ` +
    `survived: it took long-run growth to 0.93% and nothing here noticed.`);

  // 2. K/Y is what START was solved to hold. investment_share is
  //    (delta + g) * K/Y, so if this drifts either the share or one of the two
  //    depreciation rates is wrong — and they were both wrong at once.
  const kOverY = s.capital_stock / s.potential_output;
  assert.ok(Math.abs(kOverY - kOverY0) < 0.02,
    `K/Y went ${kOverY0.toFixed(4)} -> ${kOverY.toFixed(4)} over 200 quiet ` +
    `months. START.investment_share is SOLVED as (delta + g) * K/Y to hold it ` +
    `fixed; a drift means the share, SS_DEPRECIATION or DEPRECIATION_RATE ` +
    `disagree, or the capital law of motion has a unit error.`);
});

test('credibility rises when the target is hit, and slowly', () => {
  const s = newState();
  const before = s.credibility;
  run(s, 200, QUIET);
  assert.ok(s.credibility > before, 'hitting the target for 200 months built no trust');
  assert.ok(s.credibility - before < 0.25,
    `credibility rebuilt ${(s.credibility - before).toFixed(3)} in 200 months — ` +
    `too fast. It should fall ~3x quicker than it rebuilds.`);
});

test('the credit gap does not open on its own', () => {
  // This one is load-bearing for the Bubble scenario: if the baseline gap
  // drifts, "every gauge looks healthy and you still die" stops being true.
  const s = newState();
  run(s, 400, QUIET);
  assert.ok(Math.abs(s.credit_to_gdp_gap) < 0.1,
    `credit gap reached ${s.credit_to_gdp_gap}pp with no player input`);
});

/**
 * A GAUGE MUST NOT LIE AT REST [4th audit 5.13, open_items B7].
 *
 * `business_confidence` is declared 60 in `state.js` and in `docs/01`, and it
 * settled at exactly 48.000 on tick one of a flawless steady state and stayed
 * there for two hundred months. The whole 12-point gap was one term comparing
 * `user_cost` — a user cost OF CAPITAL, carrying depreciation — against
 * `market_real_rate_ss`, a real INTEREST RATE that does not. They are not the
 * same kind of quantity, so the wedge was exactly `DEPRECIATION_RATE * 100`
 * and was pure units, the same class of error as B2 and 5.5.
 *
 * `consumer_confidence` settling at exactly its neutral 60 is what made the 48
 * legible as an error rather than a design choice, and it is why this test
 * checks BOTH: one gauge agreeing with its own declaration is the control.
 *
 * Nothing read `business_confidence` when this was found — but task 8.10
 * exists to put it on screen, and a gauge that reads 48 in a perfect economy
 * is the `price_level` invariant's own argument one file over.
 *
 * The repair was one anchor, not one correction: `s.user_cost_ss` now lives in
 * `state.js` beside the other steady-state anchors, and `updateInvestment` —
 * which had always compared against the right thing — reads it too, so the two
 * cannot drift apart. That is 5.10's `DEMAND_BOUNDS` pattern.
 */
test('the confidence gauges read their declared neutral at rest', () => {
  const start = newState();
  const s = newState();
  run(s, 200, QUIET);
  for (const k of ['business_confidence', 'consumer_confidence']) {
    assert.ok(Math.abs(s[k] - start[k]) < 1e-9,
      `${k} is declared ${start[k]} and reads ${s[k].toFixed(6)} after 200 calm ticks. ` +
      `A gauge that does not sit at its own neutral in a flawless economy is ` +
      `reporting a units error, not an economy — business_confidence read 48.000 ` +
      `for the life of the model because it compared a user cost of capital ` +
      `against a real interest rate.`);
  }
  // The structural reason, asserted rather than implied: at rest the cost of
  // capital IS its steady-state value, so the term must contribute nothing.
  assert.ok(Math.abs(s.user_cost - s.user_cost_ss) < 1e-9,
    `user_cost ${s.user_cost} and user_cost_ss ${s.user_cost_ss} disagree at rest, ` +
    `so every rule that measures a stance against the steady-state cost of ` +
    `capital — investment and business confidence — starts from a false zero.`);
});
