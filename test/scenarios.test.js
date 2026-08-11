/**
 * Every scenario must be internally consistent AND survivable by SOME policy.
 * A scenario that cannot be won teaches helplessness, not economics — except
 * stagflation, which is allowed to have no clean answer. That is its lesson.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/game/scenarios.js';
import { newState, regime } from '../src/state.js';
import { P } from '../src/params.js';
import { run } from '../src/engine.js';
import { applyAutopilot } from '../src/game/autopilot.js';
import { applyDialChange } from '../src/game/dials.js';
import { LagPipeline } from '../src/lags.js';

test('every scenario starts internally consistent', () => {
  for (const [key, sc] of Object.entries(SCENARIOS)) {
    const s = newState(sc.overrides);
    const g = (s.potential_growth + s.inflation) / 100;
    const interest = s.govt_debt * s.yield_10y / 100;
    const deficit = s.govt_spending + s.transfers + interest - s.tax_rate;
    assert.ok(Math.abs(deficit - s.deficit) < 0.01,
      `${key}: budget-implied deficit ${deficit.toFixed(2)} != ${s.deficit}. ` +
      `An inconsistent start drifts from tick 1 and the run teaches nothing.`);
  }
});

test('the bubble scenario looks healthy on every gauge except the credit gap', () => {
  // The best teaching tool in the set, and it only works if this holds.
  const s = newState(SCENARIOS.bubble?.overrides);
  assert.ok(s.inflation < 3 && s.unemployment < 6 && s.approval > 50,
    'the bubble scenario should look fine everywhere the player is looking');
  assert.ok(s.credit_to_gdp_gap > 3,
    'the credit gap should already be warning');
});

test('the bubble hides for four years — the design promise', () => {
  // THE POINT OF THE WHOLE SCENARIO. If the headline gauges start looking bad
  // early, the player hikes, and the thing it was built to teach never
  // happens. Every visible number must stay healthy while the credit gap
  // crosses the BIS danger line.
  //
  // INFLATION IS IN THIS LIST NOW. It was not, and the previous scenario
  // crossed 3% by month three and reached 4.7% by year four — the most
  // visible gauge on the screen shouting while the test called it hidden
  // (docs/07 M6). An unasserted promise is not a promise.
  const s = newState(SCENARIOS.bubble.overrides);
  for (let year = 1; year <= 4; year++) {
    run(s, 12, { assertEveryTick: false });
    assert.ok(s.inflation < 3, `year ${year}: inflation ${s.inflation.toFixed(1)}% is visibly bad`);
    assert.ok(s.unemployment < 6, `year ${year}: unemployment ${s.unemployment.toFixed(1)} is visibly bad`);
    assert.ok(s.approval > 55, `year ${year}: approval ${s.approval.toFixed(0)} is visibly bad`);
    assert.ok(regime(s) === 'GOLDILOCKS',
      `year ${year}: the regime box reads ${regime(s)}, which tells the player ` +
      `to act on something other than the credit gap`);
  }
  assert.ok(s.credit_to_gdp_gap > 9,
    `after 4 years the credit gap is only ${s.credit_to_gdp_gap.toFixed(1)}pp — ` +
    `it must cross the 9pp BIS line while everything else looks fine`);
});

test('every scenario starts in, and stays a quarter in, its advertised regime', () => {
  // "A regime also has to be DRIVEN, not asserted" — scenarios.js says it and
  // nothing enforced it. The recession scenario asserted unemployment 9% with
  // a stimulative rate and no demand shortfall, so its output gap was
  // POSITIVE from month one and unemployment was under 5% by month six. Its
  // trap — that the rate dial is already dead — was never tested (docs/07 M6).
  const expected = {
    calm: 'GOLDILOCKS',
    overheating: 'OVERHEATING',
    recession: 'RECESSION',
    stagflation: 'STAGFLATION',
    debt_trap: 'GOLDILOCKS',        // the debt is the problem, not the cycle
    bubble: 'GOLDILOCKS',           // by design: nothing visible is wrong
  };
  // A QUARTER, not a year, and that is the honest window. A scenario is a
  // starting POSITION; where it goes is the game. Stagflation in particular
  // cannot hold its box for a year, because holding it would require the
  // model to be stable at 9% inflation with a passive central bank — and the
  // Taylor principle says it must not be. What has to be true is that the
  // player arrives in the regime the scenario advertises and gets long enough
  // to read the board.
  for (const [key, sc] of Object.entries(SCENARIOS)) {
    const s = newState(sc.overrides);
    assert.equal(regime(s), expected[key], `${key} does not even START in its regime`);
    run(s, 3, { assertEveryTick: false, events: false });
    assert.equal(regime(s), expected[key],
      `${key} drifted out of ${expected[key]} within a quarter with no player ` +
      `input: gap ${s.output_gap.toFixed(1)}, inflation ${s.inflation.toFixed(1)}, ` +
      `unemployment ${s.unemployment.toFixed(1)}`);
  }
});

test('the recession scenario has the rate dial genuinely dead', () => {
  // Its stated trap. Worth asserting, because the previous version had 2pp of
  // room and an economy that recovered on its own inside six months.
  const s = newState(SCENARIOS.recession.overrides);
  run(s, 12, { assertEveryTick: false, events: false });
  assert.ok(s.output_gap < -3, `the gap is ${s.output_gap.toFixed(1)} after a year`);
  assert.ok(s.policy_rate - P.SS_ELB.value < 1.0,
    `there is still ${(s.policy_rate - P.SS_ELB.value).toFixed(2)}pp of room on the ` +
    `rate dial — the scenario's whole trap is that there is not`);
});

test('no scenario produces absurd numbers inside a term', () => {
  // The linearised stability test is blind to this: both the fire-sale and
  // collateral terms sit at a max(0, ...) kink AT the steady state, so a loop
  // that is explosive only AWAY from rest reads as perfectly stable there.
  // This caught the credit-asset loop going vertical in the bubble scenario.
  for (const [key, sc] of Object.entries(SCENARIOS)) {
    // Run under a Taylor-rule central bank. With NO policy at all, a
    // scenario starting above target must diverge — that is the Taylor
    // principle working, not a bug. What has to hold is that a rule-following
    // central bank keeps every scenario numerically sane.
    const s = newState(sc.overrides);
    run(s, 96, { assertEveryTick: false, autopilot: applyAutopilot });
    for (const k of ['inflation', 'asset_prices', 'output_gap', 'govt_debt']) {
      assert.ok(Number.isFinite(s[k]) && Math.abs(s[k]) < 1e4,
        `${key}: ${k} reached ${s[k]} within a term` +
        (s.ending ? ` (ended in ${s.ending.title})` : ''));
    }
  }
});

test('NEUTRAL ANCHORS ARE BUILT FROM NEUTRAL, in every scenario', () => {
  // docs/08 §8 fixed this for policy_rate_ss and market_real_rate_ss and missed
  // velocity_v0 one line away (docs/12 M1). An anchor that means "neutral" and
  // is built from `s.policy_rate` means "wherever this scenario happened to
  // open", and every mechanism hanging off it becomes scenario-dependent for a
  // reason that is not economics. velocity_v0 multiplies the monetisation
  // pass-through, so the printing lesson had a different price in `recession`
  // than in `stagflation`.
  //
  // Written as a PERTURBATION rather than a formula check, so it catches the
  // next one too: rebuild each scenario with a different opening policy rate,
  // and nothing that means "neutral" may move.
  const NEUTRAL_ANCHORS = ['policy_rate_ss', 'market_real_rate_ss', 'velocity_v0'];
  for (const [key, sc] of Object.entries(SCENARIOS)) {
    const a = newState(sc.overrides);
    const b = newState({ ...sc.overrides, policy_rate: (sc.overrides.policy_rate ?? 2.5) + 3 });
    for (const anchor of NEUTRAL_ANCHORS) {
      assert.equal(a[anchor], b[anchor],
        `${key}: ${anchor} changed from ${a[anchor]} to ${b[anchor]} when the ` +
        `scenario's OPENING POLICY RATE moved. It is supposed to mean "neutral", ` +
        `so it must be built from neutral_real_rate + inflation_target.`);
    }
  }
  // And the value itself is the same everywhere, since all six scenarios share
  // r* and the target. If a scenario ever varies those, this line is the one
  // to relax — not the one above.
  const v = Object.values(SCENARIOS).map((sc) => newState(sc.overrides).velocity_v0);
  assert.equal(new Set(v).size, 1,
    `velocity_v0 differs across scenarios: ${[...new Set(v)].join(', ')}`);
});

/* ------------------------------------------------------------------------
 * debt_trap WAS PROVABLY INERT (docs/12 M2).
 *
 * Measured before this pass: the Taylor arm was BIT-IDENTICAL to doing
 * nothing over 48 months — max |debt difference| exactly 0.00e+0. output_gap
 * sat at 0.000000 and inflation at 2.0 for the whole run, so taylorRate
 * returned 2.5 every month and nothing was ever scheduled. Debt compounded
 * 140 -> 228 and the ending fired at m48 in both arms. It was the only
 * scenario that offered the player no decision at all.
 *
 * The cause was not scenario design. The sovereign yield was read in exactly
 * two places — the government's own interest bill and the debt-crisis ending —
 * so the private economy could not tell 3% sovereign borrowing costs from 7%.
 * The loop that IS a debt trap did not exist. Two mechanisms restore it, and
 * both are defects in their own right:
 *   SOVEREIGN_TO_CORPORATE_PASSTHROUGH  the yield reaches private borrowing
 *   DEBT_AVERAGE_MATURITY_YEARS         only the maturing slice reprices
 * ---------------------------------------------------------------------- */

function debtTrapArm(apply, months = 96) {
  const s = newState(SCENARIOS.debt_trap.overrides);
  const snapshots = run(s, months, {
    events: false, assertEveryTick: false, endings: true, keepSnapshots: true,
    ...(apply ? { autopilot: (st, pipe) => { if (st.tick === 0) apply(st, pipe); } } : {}),
  });
  return { s, snapshots, at: (m) => snapshots[Math.min(m, snapshots.length) - 1] };
}

test('debt_trap: the real economy responds to the yield at all', () => {
  const passive = debtTrapArm(null, 48);
  assert.ok(passive.at(48).output_gap < -1,
    `the output gap is ${passive.at(48).output_gap.toFixed(4)} after four years of a 7% ` +
    `sovereign yield with 60% of the debt held abroad. It used to be 0.000000 for ` +
    `the whole run, which is why nothing the player did was visible.`);
  assert.ok(passive.s.sovereign_premium_felt > 0.5,
    `private borrowers are paying only ${passive.s.sovereign_premium_felt.toFixed(3)}pp ` +
    `of the sovereign's risk premium`);
});

test('debt_trap: the benchmark central bank is no longer identical to doing nothing', () => {
  const passive = debtTrapArm(null, 48);
  const taylor = (() => {
    const s = newState(SCENARIOS.debt_trap.overrides);
    run(s, 48, { events: false, assertEveryTick: false, endings: true,
                 autopilot: applyAutopilot });
    return s;
  })();
  assert.ok(Math.abs(taylor.govt_debt - passive.s.govt_debt) > 1,
    `the Taylor arm ended at debt ${taylor.govt_debt.toFixed(4)} and the passive arm at ` +
    `${passive.s.govt_debt.toFixed(4)} — a difference of ` +
    `${Math.abs(taylor.govt_debt - passive.s.govt_debt).toExponential(2)}pp. It was ` +
    `exactly zero before docs/12 M2.`);
});

test('debt_trap: THE DECISION — you cannot consolidate your way out alone', () => {
  // The trade-off the scenario now contains, and the reason it is worth
  // playing. Consolidating the PRIMARY balance and cutting the COST of the
  // debt are different levers with different costs, and only one of them is
  // the obvious move.
  const passive = debtTrapArm(null);
  const austerity = debtTrapArm((s, p) => applyDialChange(s, p, 'tax_rate', s.tax_rate + 4));
  const cheaper = debtTrapArm((s, p) => applyDialChange(s, p, 'policy_rate', P.SS_ELB.value));
  const both = debtTrapArm((s, p) => {
    applyDialChange(s, p, 'tax_rate', s.tax_rate + 4);
    applyDialChange(s, p, 'policy_rate', P.SS_ELB.value);
  });

  assert.ok(passive.s.ending, 'doing nothing has to lose');
  assert.ok(austerity.s.ending,
    'austerity ALONE has to lose too — it delays the crisis and crushes the ' +
    'economy, and that is the lesson');
  assert.ok(austerity.s.output_gap < passive.s.output_gap - 2,
    `austerity left the gap at ${austerity.s.output_gap.toFixed(2)} against ` +
    `${passive.s.output_gap.toFixed(2)} passive — it has to visibly cost output`);
  assert.ok(!both.s.ending,
    'consolidating AND cutting the cost of the debt has to be survivable, or the ' +
    'scenario teaches helplessness');
  // ...and the escape has a price, so it is a decision rather than a free lunch.
  assert.ok(cheaper.s.inflation > passive.s.inflation + 1.5,
    `cutting rates to the floor left inflation at ${cheaper.s.inflation.toFixed(2)}% ` +
    `against ${passive.s.inflation.toFixed(2)}% — inflating out of a debt trap has ` +
    `to be visible as inflation`);
  // And the paths diverge by far more than the >15pp the audit brief asked for.
  const spread = Math.abs(both.at(48).govt_debt - passive.at(48).govt_debt);
  assert.ok(spread > 15,
    `the two paths differ by only ${spread.toFixed(1)}pp of debt at month 48`);
});

test('a hike does not bite the interest bill on impact', () => {
  // DEBT_AVERAGE_MATURITY_YEARS. The whole stock used to reprice every month,
  // so docs/11's "debt is the second fastest thing to respond to a rate cut"
  // was an artefact rather than a result.
  const base = newState();
  const hit = newState();
  const bp = new LagPipeline(), hp = new LagPipeline();
  run(base, 6, { pipeline: bp, events: false, assertEveryTick: false });
  run(hit, 6, { pipeline: hp, events: false, assertEveryTick: false });
  applyDialChange(hit, hp, 'policy_rate', hit.policy_rate + 3);
  const dYield = [], dCoupon = [];
  for (let m = 0; m < 24; m++) {
    run(base, 1, { pipeline: bp, events: false, assertEveryTick: false });
    run(hit, 1, { pipeline: hp, events: false, assertEveryTick: false });
    dYield.push(hit.yield_10y - base.yield_10y);
    dCoupon.push(hit.average_coupon - base.average_coupon);
  }
  assert.ok(dYield[0] > 2.5,
    `the market yield moved only ${dYield[0].toFixed(3)}pp on a 3pp hike — markets reprice fast`);
  assert.ok(dCoupon[0] < dYield[0] * 0.05,
    `the rate actually PAID moved ${dCoupon[0].toFixed(4)}pp in the first month against ` +
    `${dYield[0].toFixed(3)}pp on the market — only 1/${P.DEBT_AVERAGE_MATURITY_YEARS.value} ` +
    `of the stock refinances a year`);
  assert.ok(dCoupon[23] > dCoupon[0] * 10 && dCoupon[23] < dYield[23],
    `after two years the coupon has moved ${dCoupon[23].toFixed(3)}pp of the yield's ` +
    `${dYield[23].toFixed(3)}pp — it must be catching up, and must not have arrived`);
});
