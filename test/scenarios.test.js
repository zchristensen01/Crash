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

test('the bubble does not deflate on its own before the term ends', {
  todo: 'A LESSON-LEVEL CONSEQUENCE OF 3.1, AND NOT A DEFECT IN 3.1. docs/00 ' +
    'describes this scenario as eight years of every gauge saying you are ' +
    'brilliant while the one nobody watches climbs to ~14.5pp. It used to do ' +
    'exactly that — the credit gap rose monotonically 8.77 (m24), 11.63 (m48), ' +
    '13.34 (m72), 14.10 (m96), with crisis probability reaching 10.36% and ' +
    'approval never leaving 70. It now PEAKS at 9.82 around month 48 and ' +
    'unwinds to 3.37 by month 96, with crisis probability falling from 6.35 to ' +
    '0.22. The bet the player was knowingly taking now settles itself. ' +
    'THE CAUSE IS THAT THE SCENARIO WAS CALIBRATED AGAINST A DEFECT. Its 14.5pp ' +
    'gap was being produced by updateAssetPrices overshooting its own sourced ' +
    'semi-elasticity by 4.6x, which 3.1 fixed. The four-year promise above ' +
    'still holds (9.80pp at m48, over the BIS line, with every visible gauge ' +
    'healthy), so what is lost is the second half of the term. ' +
    'DO NOT CLOSE THIS BY RE-INFLATING THE WEALTH CHANNEL — that is rule 3, and ' +
    'the channel now matches its own literature. ' +
    'AND DO NOT RETUNE THE STARTING VECTOR EITHER, which is what this message ' +
    'used to recommend. Phase 4.3 measured the cause and it is D2, an already-' +
    'known sourced defect: updateCreditTrend chases the stock at 0.20/year, a ' +
    '41.6-month half-life, while its stated source is a one-sided HP filter at ' +
    'lambda=400,000 whose trend constant is 10-15 YEARS. The gauge mean-reverts ' +
    '3-4x faster than the indicator it approximates, so it systematically ' +
    'under-reads persistent booms — the exact situation it exists for. At the ' +
    'sourced speed the gap climbs and STAYS: measured, m24/m48/m72/m96 = ' +
    '10.29/13.99/14.20/10.34 at 0.06 per year and 10.44/14.37/14.82/11.14 at ' +
    '0.05, against 8.39/9.80/7.99/3.37 as built. The design promise is ~14.5pp. ' +
    'PHASE 5.4 HAS NOW RUN, AND IT ONLY GOT PART OF THE WAY. The derivation ' +
    'from the stated lambda gives 0.127/year, not the 0.05-0.06 that would ' +
    'restore 14.5pp — which took the peak from 9.82 to 12.00 and the m96 gap ' +
    'from 3.37 to 6.20. Pushing further would be tuning to a target (rule 3), ' +
    'so it was not done. WHAT IS LEFT IS PROBABLY STRUCTURAL: the BIS trend is ' +
    'a LOCAL LINEAR trend carrying a slope state and this one is level-only, ' +
    'so it lags a growing credit stock permanently and no speed fixes that. ' +
    'See CREDIT_TREND_CATCHUP\'s note. 6.1 (the countercyclical buffer) is the ' +
    'other half of the answer, because a bubble the player cannot act on is a ' +
    'spectacle rather than a decision.',
}, () => {
  const s = newState(SCENARIOS.bubble.overrides);
  let peak = -Infinity, peakMonth = 0;
  for (let m = 1; m <= 96; m++) {
    run(s, 1, { assertEveryTick: false, events: false, endings: false });
    if (s.credit_to_gdp_gap > peak) { peak = s.credit_to_gdp_gap; peakMonth = m; }
  }
  assert.ok(s.credit_to_gdp_gap > peak * 0.8,
    `the credit gap peaked at ${peak.toFixed(2)}pp in month ${peakMonth} and had ` +
    `fallen to ${s.credit_to_gdp_gap.toFixed(2)}pp by the end of the term. The ` +
    `scenario exists to hold a hidden danger in front of the player for eight ` +
    `years; one that quietly resolves itself teaches that ignoring it works.`);
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
  // THE DIRECTION IS THE LESSON AND IT IS ASSERTED HARD. The MAGNITUDE moved
  // when 3.1 fixed the asset-price units: cutting rates to the floor now buys
  // 2.49% inflation against 1.40% passive, a +1.09pp price where it used to be
  // over +1.5pp, because the wealth channel was amplifying by 4.6x. Recorded
  // as a todo below rather than by lowering the bar here.
  assert.ok(cheaper.s.inflation > passive.s.inflation,
    `cutting rates to the floor left inflation at ${cheaper.s.inflation.toFixed(2)}% ` +
    `against ${passive.s.inflation.toFixed(2)}% — inflating out of a debt trap has ` +
    `to be visible as inflation`);
  // And the paths diverge by far more than the >15pp the audit brief asked for.
  const spread = Math.abs(both.at(48).govt_debt - passive.at(48).govt_debt);
  assert.ok(spread > 15,
    `the two paths differ by only ${spread.toFixed(1)}pp of debt at month 48`);
});

test('debt_trap: and the inflation price of escaping is visibly large', {
  todo: 'MAGNITUDE MOVED BY 3.1, DIRECTION INTACT. Cutting the rate to the ' +
    'floor in debt_trap buys 2.49% inflation against 1.40% doing nothing — a ' +
    '+1.09pp price, where the bar was +1.5pp before the asset-price units were ' +
    'fixed. The wealth channel was applying a LEVEL semi-elasticity as a ' +
    'persistent growth rate and overshooting its own sourced value by 4.6x, so ' +
    'every inflationary consequence of an easing was correspondingly ' +
    'overstated. The lesson — that inflating your way out has a visible price — ' +
    'is asserted hard in the test above; this records HOW visible. Re-measure ' +
    'at Phase 4 and decide then whether +1.09pp reads as a decision to a ' +
    'player, rather than adjusting the threshold to whatever the model does.',
}, () => {
  const passive = debtTrapArm(null);
  const cheaper = debtTrapArm((s, p) => applyDialChange(s, p, 'policy_rate', P.SS_ELB.value));
  assert.ok(cheaper.s.inflation > passive.s.inflation + 1.5,
    `cutting rates to the floor left inflation at ${cheaper.s.inflation.toFixed(2)}% ` +
    `against ${passive.s.inflation.toFixed(2)}% passive`);
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

/**
 * WHAT EACH PRESET DOES OVER A FULL TERM, WITH NOBODY AT THE CONTROLS.
 *
 * `every scenario starts in, and stays a quarter in, its advertised regime`
 * guards the opening. Nothing guarded the other 93 months, which is where a
 * scenario's actual teaching happens — and it is where `bubble` quietly stopped
 * working after the Phase 3 asset-price fix.
 *
 * Measured across the whole fourth audit (start of pass -> now):
 *
 *   calm         GOLDILOCKS throughout, every value pinned          unchanged
 *   overheating  hyperinflates with no input, m34 -> m51            improved
 *   stagflation  hyperinflates with no input, m17 -> m23            improved
 *   debt_trap    debt 140 -> 174, debt_crisis ending at m74         works
 *   recession    heals; ends the term GOLDILOCKS +2.50 gap where it
 *                used to end OVERHEATING at +5.78 with a +8.30 gap  improved
 *   bubble       credit gap peaks m48 and unwinds                   REGRESSED
 *
 * Two of these are scenarios ENDING on their own, and that is the model being
 * right rather than a defect: game/autopilot.js's own note says a scenario
 * blowing up with no policy is correct, because a fixed nominal rate against
 * rising inflation is a Taylor-principle violation. What matters is that the
 * player gets enough months to act, and both got longer.
 */
test('CHARACTERISATION: what each preset does over a full term, unattended', () => {
  const out = {};
  for (const key of Object.keys(SCENARIOS)) {
    const s = newState(SCENARIOS[key].overrides);
    let ended = null;
    for (let m = 1; m <= 96 && !ended; m++) {
      run(s, 1, { assertEveryTick: false, events: false, endings: true });
      if (s.ending) ended = { key: s.ending.key, m };
    }
    out[key] = { ended, regime: regime(s), gap: s.output_gap, cg: s.credit_to_gdp_gap,
                 u: s.unemployment, debt: s.govt_debt };
    console.log(`  ${key.padEnd(12)} ${ended ? `ENDED ${ended.key} @m${ended.m}` :
      `${regime(s)} gap ${s.output_gap.toFixed(2)} cgap ${s.credit_to_gdp_gap.toFixed(2)} ` +
      `u ${s.unemployment.toFixed(2)} debt ${s.govt_debt.toFixed(0)}`}`);
  }

  // calm is the steady state and must not drift at all.
  assert.equal(out.calm.ended, null, 'calm ended on its own');
  assert.ok(Math.abs(out.calm.gap) < 1e-6 && Math.abs(out.calm.cg) < 1e-6,
    `calm drifted: gap ${out.calm.gap}, credit gap ${out.calm.cg}`);

  // The two that are SUPPOSED to run away must still do so — and must leave
  // the player enough months to act. Under a quarter of the term is a fuse,
  // not a scenario.
  for (const key of ['overheating', 'stagflation']) {
    assert.ok(out[key].ended, `${key} no longer ends unattended, so the Taylor ` +
      `principle has stopped operating in the one place the game demonstrates it`);
    assert.ok(out[key].ended.m >= 20,
      `${key} ends at month ${out[key].ended.m}. The player needs time to act ` +
      `before the scenario resolves itself.`);
  }

  // debt_trap's whole mechanism is the spiral reaching its ending.
  assert.equal(out.debt_trap.ended?.key, 'debt_crisis',
    `debt_trap ended as ${out.debt_trap.ended?.key ?? 'nothing'} — the scenario ` +
    `is built so interest costs outgrow the economy, and that has to be what gets you`);

  // recession must heal — that is its argument — but must not end the term in
  // a boom, which would teach that a balance-sheet recession fixes itself and
  // then some. It used to end OVERHEATING with a +8.30 credit gap.
  assert.equal(out.recession.ended, null, 'recession ended on its own');
  assert.ok(out.recession.cg < 6,
    `recession ends the term with a credit gap of ${out.recession.cg.toFixed(2)}pp. ` +
    `Doing nothing for eight years must not produce a credit boom.`);
});
