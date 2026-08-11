/**
 * E1 — THE DIVERGENCE GUARD.
 *
 * THE MISSING TEST. Section B of the fourth audit brief found that a permanent
 * 1pp rate cut has no steady state anywhere: asset/fundamental reaches
 * 2.87e11 by month 480. Three audits missed it, and the reason they missed it
 * is that nothing ever ran a permanent dial move past the 96-month term.
 *
 * WHY test/stability.test.js DID NOT CATCH IT, which is the interesting part.
 * That test computes the spectral radius of the core block's Jacobian AT THE
 * STEADY STATE, and the loop's gain turns out to depend enormously on where
 * you stand. Measured on the pre-fix tree — amplification of a credit_impulse
 * shock over 96 months:
 *
 *     steady state          0.0130      stable
 *     1pp cut, settled      0.0169      stable
 *     2pp cut, settled    315.5195      EXPLOSIVE
 *
 * Two percentage points from the point of linearisation, four orders of
 * magnitude. A Jacobian at the fixed point cannot see that. So this guard
 * sweeps rather than differentiates, and test/credit-loop.test.js now measures
 * the gain at four operating points on every run.
 *
 * THE FIRST VERSION OF THIS COMMENT NAMED THE WRONG KINK, and the correction
 * belongs here rather than in a changelog. It said the loop was switched off
 * at the steady state by `excess = gap - 3.0` and `assetBoom 1.25`. Those are
 * at credit.js:318-322, they gate updateCrisisProbability — the crash METER,
 * a display quantity — and they have nothing to do with the loop. The real
 * kink is `Math.max(0, credit_growth_annual - nominalGrowth)` in
 * updateAssetPrices, which is exactly zero at the steady state. The claim was
 * READ from the source instead of measured, which is precisely the error this
 * project's standing rule exists to prevent, and it survived a commit.
 *
 * WHAT COUNTS AS DIVERGENCE, and this is the part that took the measuring.
 * "No state variable may diverge" cannot be asserted literally, because the
 * model contains quantities that are SUPPOSED to compound and loops that are
 * SUPPOSED to run away:
 *
 *   - price_level, govt_debt, deficit, potential_output and output are LEVELS.
 *     price_level is cumulative inflation by invariant 6; forty years of 10%
 *     inflation is 45x and that is arithmetic, not a defect.
 *   - `debt_service_spiral` is in parameters.py's UNBALANCED_LOOPS with no
 *     balancing counterpart on purpose (docs/02 Self-correction 5: the brake
 *     is forced consolidation, and in this game the player IS the government).
 *     stability.test.js excludes govt_debt from its core block for exactly
 *     this reason and bounds its rate separately.
 *   - A PEGGED nominal rate below neutral is Fisher-unstable, and
 *     game/autopilot.js says so in as many words: "any scenario starting above
 *     target diverges [...] A scenario blowing up with no policy is the model
 *     being RIGHT."
 *
 * So the guard is over STATIONARY quantities — ratios and rates the model
 * itself defines as having a resting value — and every divergence it finds is
 * ATTRIBUTED BY AN ISOLATING EXPERIMENT rather than by argument. That is the
 * standing rule the fourth pass adds: when you state a mechanism, state the
 * experiment that isolates it. docs/12 measured a real bifurcation and
 * attributed it to a channel it had never switched off.
 *
 * The attribution re-runs the same setting with one loop disabled:
 *   - bubble loop:         ASSET_PRICE_CREDIT_CHANNEL = 0
 *   - debt-service spiral: govt_debt pinned to its opening value
 * Whichever switch-off makes the path bounded is the cause. A divergence that
 * survives both is the nominal-peg instability, which is economics.
 *
 * THE ASSERTION is therefore narrow and it is the right one: a divergence
 * caused by a loop that parameters.py's UNBALANCED_LOOPS does not declare is
 * a defect. The bubble loop is not in that register, and it does not need to
 * be: Phase 3.2 measured its gain at four operating points and it is below one
 * at all of them, so it has no business in a register of loops that diverge on
 * purpose. (credit.js used to assert in a comment that the loop "has no
 * balancing counterpart — that is the whole point of it". It has one, it is
 * sourced, and that comment is now corrected in place.)
 *
 * A LATER PASS MUST NOT GO GREEN BY ADDING THE BUBBLE LOOP TO THE REGISTER.
 * That was the live risk while this guard was failing. It is closed the right
 * way — the loop stopped diverging — and the same rule still applies to
 * whatever diverges next.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState } from '../src/state.js';
import { tick } from '../src/engine.js';
import { Trace } from '../src/trace.js';
import { LagPipeline } from '../src/lags.js';
import { makeRng } from '../src/rng.js';
import { DIALS, applyDialChange } from '../src/game/dials.js';
import { P, UNBALANCED_LOOPS } from '../src/params.js';

const HORIZON = 480;                       // forty years

/**
 * Scale bounds, and they are JUDGEMENT — labelled as such under ground rule 8.
 * They are not calibration: each is an order of magnitude past anything any
 * economy has recorded, so the guard fires on "no equilibrium", never on "a
 * large number". A defect that only shows up between 200% and 500% of
 * potential output is not what this test is for.
 */
const STATIONARY = {
  output_gap: 200,              // output at three times potential
  inflation: 1000,              // the hyperinflation ending fires far below
  expected_inflation: 1000,
  credit_to_gdp_gap: 500,       // Borio-Lowe crisis threshold is 9
  credit_spread: 100,
  consumption: 500,             // % of potential; investment is clamped to 45
  asset_prices: 1e5,            // a REAL index, 100 at rest (state.js)
  asset_over_fundamental: 100,  // the bubble measure Section B reports
};

/**
 * Hold `key` at `value` for 480 months from `calm` and report the first
 * stationary quantity to leave its band, or null.
 *
 * Endings are OFF deliberately. An ending is the game's terminal condition,
 * not the model's: "the run stopped before the number got silly" is not
 * evidence that the number settles, and at a 1pp cut the hyperinflation ending
 * does not fire until month 261 — 165 months after the game the player is
 * actually playing has finished.
 */
function firstDivergence(key, value, { noBubble = false, noDebtSpiral = false } = {}) {
  const saved = P.ASSET_PRICE_CREDIT_CHANNEL.value;
  if (noBubble) P.ASSET_PRICE_CREDIT_CHANNEL.value = 0;
  try {
    const s = newState();
    const trace = new Trace(false);
    const pipeline = new LagPipeline();
    const rng = makeRng(1);
    const debt0 = s.govt_debt;
    applyDialChange(s, pipeline, key, value);
    for (let m = 1; m <= HORIZON; m++) {
      tick(s, trace, pipeline, rng,
        { events: false, endings: false, assertEveryTick: false, findNaN: false });
      if (noDebtSpiral) s.govt_debt = debt0;
      const probe = { ...s, asset_over_fundamental: s.asset_prices / s.asset_fundamental };
      for (const [k, limit] of Object.entries(STATIONARY)) {
        if (!Number.isFinite(probe[k]) || Math.abs(probe[k]) > limit) {
          return { k, m, v: probe[k] };
        }
      }
    }
    return null;
  } finally {
    P.ASSET_PRICE_CREDIT_CHANNEL.value = saved;
  }
}

/**
 * The settings to try. The declared range in nine steps, PLUS the ordinary
 * moves — a quarter point, a half, one, two and five in each direction from
 * where the dial starts.
 *
 * The ordinary moves are not decoration. A nine-point sweep of the rate dial
 * steps from -0.75 to 1.84 and straight over 1.5, which is the exact setting
 * Section B1 diverges at: the whole finding sits in a 0.1pp band between 1.5
 * (runs away) and 1.6 (settles). Ground rule 2 — state dependence needs two
 * measurements, and three past findings were step functions sitting in the
 * middle of the playable range.
 */
function settings(d) {
  const start = newState()[d.key];
  const span = d.max - d.min;
  const grid = Array.from({ length: 9 }, (_, i) =>
    Math.round((d.min + span * i / 8) * 1000) / 1000);
  const ordinary = [0.25, 0.5, 1, 2, 5].flatMap((x) => [start - x, start + x]);
  return [...new Set([start, ...grid, ...ordinary])]
    .filter((v) => v >= d.min && v <= d.max)
    .sort((a, b) => a - b);
}

function sweep() {
  const rows = [];
  for (const d of DIALS) {
    for (const v of settings(d)) {
      const base = firstDivergence(d.key, v);
      if (!base) { rows.push({ dial: d.key, v, bounded: true }); continue; }
      const cause = !firstDivergence(d.key, v, { noBubble: true })
        ? 'bubble_credit_collateral'
        : !firstDivergence(d.key, v, { noDebtSpiral: true })
          ? 'debt_service_spiral'
          : 'nominal_peg';
      rows.push({ dial: d.key, v, bounded: false, at: base, cause });
    }
  }
  return rows;
}

test('E1: no permanent dial move diverges through an undeclared loop', () => {
  const rows = sweep();
  const declared = new Set(UNBALANCED_LOOPS);
  const undeclared = rows.filter((r) => !r.bounded && !declared.has(r.cause)
                                     && r.cause !== 'nominal_peg');

  // The frontier is printed on every run, pass or fail. A guard that only
  // speaks when it breaks tells the next pass nothing about what moved.
  const byDial = {};
  for (const r of rows) (byDial[r.dial] ??= []).push(r);
  for (const [dial, rs] of Object.entries(byDial)) {
    const stable = rs.filter((r) => r.bounded).map((r) => r.v);
    console.log(`  ${dial.padEnd(14)} settles in [${stable.length ? Math.min(...stable) : '-'}, ` +
      `${stable.length ? Math.max(...stable) : '-'}] of a declared ` +
      `[${DIALS.find((d) => d.key === dial).min}, ${DIALS.find((d) => d.key === dial).max}]` +
      `  (${rs.filter((r) => !r.bounded).length}/${rs.length} settings diverge)`);
  }

  assert.equal(undeclared.length, 0,
    `${undeclared.length} permanent dial settings diverge over ${HORIZON} ticks ` +
    `through a loop parameters.py's UNBALANCED_LOOPS does not declare:\n` +
    undeclared.map((r) => `    ${r.dial} = ${r.v}: ${r.at.k} reached ` +
      `${Number(r.at.v).toExponential(2)} at month ${r.at.m}, via ${r.cause} ` +
      `(switching that loop off makes the same run bounded)`).join('\n'));
});

/**
 * THE PHASE 3.5 GATE, and what closed it.
 *
 * Section B1's exact repro: `calm`, policy_rate -> 1.5 at month 0, nothing
 * else, 480 ticks. When this guard was written it produced A/F = 2.873e11 and
 * a credit gap of +647.89 — no steady state anywhere.
 *
 *     after Phase 2 (transmission)   A/F 1.323e11   gap 631.38
 *     after 3.1     (asset units)    A/F      1.12  gap    6.79
 *     after 5.4     (trend speed)    A/F      1.12  gap   11.79   <- current
 *
 * The last row is bookkeeping, not a regression: 5.4 slowed the credit TREND
 * from 0.20/yr to the derived 0.127, and the gap is credit minus trend, so a
 * slower trend leaves a larger standing gap at the same credit stock. A/F did
 * not move at all, which is the quantity this guard is about.
 *
 * Section A halved it and did not fix it, which is how the two sections were
 * confirmed independent. What closed it was one unit error: the asset-price
 * semi-elasticity is a LEVEL response and was being applied as a persistent
 * growth rate, so the equilibrium was set by ASSET_PRICE_MEANREVERSION rather
 * than by the elasticity, and overshot by 4.59x. Neither coefficient of the
 * credit loop was touched; both sit at their published central values.
 */
test('E1 acceptance: a permanent 1pp cut reaches a finite credit gap and A/F', () => {
  const s = newState();
  const trace = new Trace(false);
  const pipeline = new LagPipeline();
  const rng = makeRng(1);
  applyDialChange(s, pipeline, 'policy_rate', 1.5);
  for (let m = 1; m <= HORIZON; m++) {
    tick(s, trace, pipeline, rng,
      { events: false, endings: false, assertEveryTick: false, findNaN: false });
  }
  const af = s.asset_prices / s.asset_fundamental;
  console.log(`  1pp cut @m${HORIZON}: A/F = ${af.toExponential(3)}, ` +
    `credit gap = ${s.credit_to_gdp_gap.toFixed(2)}, inflation = ${s.inflation.toExponential(3)}`);
  assert.ok(Math.abs(s.credit_to_gdp_gap) < STATIONARY.credit_to_gdp_gap,
    `credit_to_gdp_gap is ${s.credit_to_gdp_gap.toExponential(3)} at month ${HORIZON}`);
  assert.ok(af < STATIONARY.asset_over_fundamental,
    `asset/fundamental is ${af.toExponential(3)} at month ${HORIZON} — asset ` +
    `prices are that multiple of what they are worth, and A/F is a REAL ratio`);
});
