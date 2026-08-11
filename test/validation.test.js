/**
 * THE MODEL, MEASURED AGAINST THE REDUCED FORMS IT IS NOT BUILT FROM.
 *
 * parameters.py carries a set of published reduced-form estimates marked
 * VALIDATION TARGET. Decision A3 says they are NOT model terms — using them
 * alongside the structural block would count the same channel twice — so they
 * are targets to shock the assembled model and check against.
 *
 * docs/07 M8 found that nobody was checking. Only FISCAL_MULT_* was used, by
 * one test; of the four others measured in the audit, four failed, one with
 * the wrong sign. This file closes that: every VALIDATION TARGET is either
 * asserted here or listed in KNOWN_DISAGREEMENTS with a measured value and a
 * reason.
 *
 * THE STANDING RULE APPLIES. Where the model lands outside a published range,
 * that is a finding to surface, not a coefficient to move. A disagreement is
 * recorded as a `todo` with the number in it, so it shows in every test run
 * and cannot be forgotten — and so nobody quietly tunes to close it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { P, DEFERRED, CONFLICTS } from '../src/params.js';
import { world, advance, dial, nudge, compare } from './harness.mjs';

// ---------------------------------------------------------------------
// The register: what is unread, and why.
// ---------------------------------------------------------------------

function sourceOfRules() {
  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(new URL(dir, import.meta.url), { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${dir}${e.name}/`);
      else if (e.name.endsWith('.js') && e.name !== 'params.js') files.push(`${dir}${e.name}`);
    }
  })('../src/');
  return files
    .map((f) => readFileSync(new URL(f, import.meta.url), 'utf8'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')          // strip comments: a parameter
    .replace(/(^|[^:])\/\/.*$/gm, '$1');       // named only in prose is unread
}

/**
 * A READ INSIDE A TRACE IS NOT A WIRING [4th audit 5.5].
 *
 * `trace.record(...)` and `trace.note(...)` are DISPLAY. A parameter mentioned
 * only there is printed and never multiplied by anything, so it satisfies the
 * register's grep while doing no work — which is exactly what
 * HAND_TO_MOUTH_SHARE was doing: one appearance, in consumption.js's trace
 * extras, and the register called it wired. It is the same carve-out
 * `tools/lint.mjs` checks (e) and (f) already make, for the same reason.
 *
 * Removed by paren-matching rather than by regex, because the argument list
 * spans lines and contains nested calls.
 *
 * NOT A LICENCE TO BREAK THE OTHER KIND OF INDIRECT CONSUMPTION.
 * RATE_PASSTHROUGH_TO_BORROWERS is read in `parameters.py` to build
 * `LAGS_MONTHS['rate_to_borrowing_cost']`, and the SS_* anchors are consumed
 * via START. Those are live structural inputs with a DEFERRED entry saying so,
 * and they are unaffected: they were never read from `src/` at all.
 */
function stripTraceCalls(src) {
  let out = '', i = 0;
  for (;;) {
    const m = src.slice(i).match(/trace\.(record|note)\(/);
    if (!m) return out + src.slice(i);
    const start = i + m.index;
    out += src.slice(i, start);
    let j = start + m[0].length, depth = 1;
    while (j < src.length && depth > 0) {
      if (src[j] === '(') depth++;
      else if (src[j] === ')') depth--;
      j++;
    }
    i = j;
  }
}

test('the DEFERRED register matches the code, in both directions', () => {
  const src = stripTraceCalls(sourceOfRules());
  const isRead = (name) => new RegExp(`P\\.\\s*${name}\\b`).test(src);

  const unreadAndUnlisted = Object.keys(P).filter((n) => !isRead(n) && !(n in DEFERRED));
  assert.deepEqual(unreadAndUnlisted, [],
    `these parameters are read by nothing and are not in parameters.py DEFERRED. ` +
    `Wire them up or say why they are idle — "43% of this file does nothing" is ` +
    `a file nobody can trust at a glance (docs/07 F1).`);

  const listedButRead = Object.keys(DEFERRED).filter(isRead);
  assert.deepEqual(listedButRead, [],
    `these are listed as deliberately unread but a rule reads them. Delete ` +
    `their DEFERRED entry — a stale register is worse than none.`);
});

test('every recorded parameter conflict is still genuinely unresolved', () => {
  // A CONFLICTS entry says "this value disagrees with how the model behaves
  // and resolving it needs research". If somebody resolves one, this fails
  // and makes them delete the entry.
  const src = sourceOfRules();
  for (const name of Object.keys(CONFLICTS)) {
    assert.ok(!new RegExp(`P\\.\\s*${name}\\b`).test(src),
      `${name} is now read by a rule but is still listed in CONFLICTS. ` +
      `If the disagreement is settled, remove the entry.`);
    assert.ok(CONFLICTS[name].length > 80, `${name}: a conflict needs an explanation`);
  }
});

// ---------------------------------------------------------------------
// The measurements.
// ---------------------------------------------------------------------

const inRange = (v, p) => v >= p.low && v <= p.high;
const report = (v, p) => `model ${v.toFixed(3)}, literature ${p.low}-${p.high}`;

test('RATE_TO_OUTPUT: 1pp of policy rate, held a year', () => {
  const r = compare({ taylor: false, shock: (w) => nudge(w, 'policy_rate', +1), months: 12 });
  const v = -r.dOutput;
  assert.ok(inRange(v, P.RATE_TO_OUTPUT), report(v, P.RATE_TO_OUTPUT));
});

test('AUTO_STABILISER_ABSORPTION: share of an income shock that never lands', () => {
  // Measured as the literature defines it — the fraction of the MARKET income
  // move that does not reach disposable income — not as a share of the output
  // move. The old test applied its shock to a variable the next rule
  // overwrote and therefore measured absorption of exactly 1.000000000.
  const r = compare({
    taylor: false, months: 12,
    shock: (w) => { w.s.govt_spending -= 5; w.s.govt_purchases -= 5; },
  });
  const absorbed = 1 - r.d('disposable_income') / r.d('market_income');
  assert.ok(inRange(absorbed, P.AUTO_STABILISER_ABSORPTION),
    report(absorbed, P.AUTO_STABILISER_ABSORPTION));
});

test('a tax cut RAISES output, and does it through consumption', () => {
  // PERSONAL_TAX_RATE_TO_GDP: "Moves consumption, not investment." The audit
  // found the model moved investment more than consumption, in the wrong
  // direction, with total output NEGATIVE for the first twelve months —
  // because crowding out landed on impact while the consumption leg climbed
  // slowly through permanent income (docs/07 M8).
  for (const months of [6, 12, 24]) {
    const r = compare({ shock: (w) => nudge(w, 'tax_rate', -1), months });
    assert.ok(r.dOutput > 0, `at ${months} months a tax cut moved output ${r.dOutput.toFixed(3)}`);
    assert.ok(r.d('consumption') > Math.abs(r.d('investment')),
      `at ${months} months the tax cut moved investment ${r.d('investment').toFixed(3)} ` +
      `and consumption ${r.d('consumption').toFixed(3)} — the personal rate is ` +
      `supposed to move consumption`);
  }
});

test('QE_TO_GDP: bond buying reaches output through the yield, and how much', {
  todo: 'FELL BELOW ITS PUBLISHED RANGE WHEN 3.1 FIXED THE ASSET-PRICE UNITS. ' +
    'The model delivers 0.019% of GDP per 1% of GDP purchased against a ' +
    'published 0.02-0.15 — just under the bottom, where it used to sit inside. ' +
    'QE reaches output through the long yield and then through asset prices, ' +
    'and the asset leg was overshooting its own sourced semi-elasticity by ' +
    '4.6x, so part of what used to satisfy this range was the unit error. ' +
    'QE_TO_GDP is `weak` in parameters.py, with the note that the real-economy ' +
    'effect is genuinely contested and some argue near-zero outside market ' +
    'dysfunction — 0.019 is comfortably inside that judgement even though it ' +
    'is outside the stated band. Recorded rather than closed: raising it means ' +
    'raising QE_TO_YIELD or the wealth channel, and the wealth channel has ' +
    'just been shown to have been wrong in the other direction.',
}, () => {
  // QE has no direct output coefficient in the model — it lowers the whole
  // curve via QE_TO_YIELD and investment responds to that. This checks the
  // reduced form the chain has to reproduce.
  const r = compare({ taylor: false, shock: (w) => dial(w, 'qe', 10), months: 24 });
  const perPoint = r.dOutput / 10;
  assert.ok(inRange(perPoint, P.QE_TO_GDP), report(perPoint, P.QE_TO_GDP));
  assert.ok(r.d('yield_10y') < -0.1, 'QE did not move the long yield');
});

// ---------------------------------------------------------------------
// KNOWN DISAGREEMENTS. Surfaced, not tuned away.
// ---------------------------------------------------------------------

test('RATE_TO_INFLATION: the model is about half the published estimate', {
  todo: 'RE-MEASURED IN PHASE 4.4. THE RESPONSE IS SLOW, NOT ABSENT, AND THE ' +
    'PLAN EXPECTED THE WRONG THING. docs/13 4.4 says the shortfall is "partly ' +
    'the lag burying the response beyond the 24-month window", so the A1 ' +
    'transmission split should have moved it. It did not: 0.1227pp at 24 ' +
    'months against the 0.122 recorded before. But the response keeps ' +
    'arriving — 0.0586 at 12 months, 0.1227 at 24, 0.1756 at 36, and 0.2192 at ' +
    '48, WHICH IS INSIDE THE PUBLISHED 0.2-0.4. The window is doing as much of ' +
    'the disagreement as the model is. ' +
    'What is left is the anchored Phillips slope doing exactly what docs/02 ' +
    'says it should: with kappa at 0.05 the demand channel barely moves prices, ' +
    'and real surges are supposed to come from supply shocks and unanchoring. ' +
    'The published range is estimated across regimes that include the ' +
    'unanchored 1970s. The slowness no longer lives in the RATE — that arrives ' +
    'in a quarter now — it lives in the investment partial adjustment and the ' +
    'Phillips curve. Do not raise kappa to close this.',
}, () => {
  const r = compare({ taylor: false, shock: (w) => nudge(w, 'policy_rate', +1), months: 24 });
  const v = -r.dInflation;
  assert.ok(inRange(v, P.RATE_TO_INFLATION), report(v, P.RATE_TO_INFLATION));
});

test('CRISIS_OUTPUT_TROUGH: the realised peak-to-trough lands in the published range', async () => {
  // WAS A `todo` FOR TWO PASSES, and is now a real assertion (docs/12 §2).
  // What closed it was not a smaller number: -9% is an OBSERVED peak-to-trough
  // fall that already contains the multiplier, and crisis.js was feeding it in
  // as an exogenous demand impulse for the model to multiply a second time.
  // The structural impulse is now the observation divided by the model's own
  // measured amplification (CRISIS_IMPULSE_AMPLIFICATION), and the scar is
  // deconvolved and phased the same way.
  //
  // MEASURED AGAINST THE PRE-CRISIS LEVEL, because that is what a published
  // peak-to-trough is. This test used to difference against a baseline growing
  // at trend, which is the CRISIS_HYSTERESIS_SCAR baseline, not this one —
  // mixing the two is what made the trough and the permanent loss look
  // mutually contradictory.
  const { EVENTS } = await import('../src/game/events.js');
  const { SCENARIOS } = await import('../src/game/scenarios.js');
  const crash = EVENTS.find((e) => e.key === 'financial_crisis');
  // MEASURED IN `bubble`, not `calm`. crisis_prob is driven by the credit gap,
  // so that is where the model's own machinery actually puts a crash — and the
  // published -6 to -15 is estimated on real crises, which by construction
  // follow credit booms. Forced into `calm` the same event troughs at -6.9% in
  // month 3, and into `recession` at -1.2%; that ordering is JST's "When
  // Credit Bites Back" and is asserted separately in test/crisis.test.js.
  const hit = world({ overrides: SCENARIOS.bubble.overrides, assert: false });
  advance(hit, 24);
  const preCrisisLevel = hit.s.output;
  crash.apply(hit.s);
  let trough = 0, troughM = 0;
  for (let m = 1; m <= 36; m++) {
    advance(hit, 1);
    const lvl = (hit.s.output / preCrisisLevel - 1) * 100;
    if (lvl < trough) { trough = lvl; troughM = m; }
  }
  assert.ok(inRange(trough, P.CRISIS_OUTPUT_TROUGH), report(trough, P.CRISIS_OUTPUT_TROUGH));
  assert.ok(troughM >= 9 && troughM <= 18,
    `the trough is at month ${troughM}; JST put it at about a year`);
});

test('TAX_SHOCK_TO_GDP: the model is far below Romer-Romer', {
  todo: 'KNOWN. A 1% of GDP tax rise costs 0.487% of output over 30 months ' +
        'against a published 2.0-3.0. (This message said ~0.33% until Phase 5 ' +
        'verification re-ran it; the model has been at 0.487 since 3.1 and was ' +
        '0.492 before, so 0.33 was never right in this pass.) ' +
        'The Romer-Romer narrative multiplier is ' +
        'the largest in the literature and famously larger than structural ' +
        'models produce; the model also has a responding central bank and a ' +
        'crowding-out term that works in the opposite direction on a tax rise. ' +
        'Recorded rather than closed: reproducing 2.5 would mean roughly ' +
        'tripling the consumption response to disposable income, which the ' +
        'MPC evidence does not support.',
}, () => {
  const r = compare({ shock: (w) => nudge(w, 'tax_rate', +1), months: 30 });
  const v = -r.dOutput / r.base.output * 100;
  assert.ok(inRange(v, P.TAX_SHOCK_TO_GDP), report(v, P.TAX_SHOCK_TO_GDP));
});

/**
 * PRIVATE DEBT HAS A MATURITY — and this used to be a failing `todo`.
 *
 * It said: "credit.js computes the debt-service burden as private_credit *
 * (policy_rate + credit_spread) / 100 — the DIAL, and the whole stock… the
 * state refinances over seven years while its households refinance overnight."
 * 5.2 built the private analogue of DEBT_AVERAGE_MATURITY_YEARS and the
 * asymmetry is gone.
 *
 * THE OLD ASSERTION IS NOT THE ONE RESTORED HERE, AND THAT IS DELIBERATE. It
 * demanded |Δdefault| < 1e-4 on impact — effectively zero — which is a claim
 * that NO private debt is floating-rate. Some of it is; that is the whole
 * content of the parameter. Asserting zero would be asserting a different
 * error. What is asserted instead is the shape the maturity structure
 * produces: almost nothing on impact, and still building years later.
 *
 * THE EXPERIMENT THAT ISOLATES IT is the third assertion — set the repricing
 * time to one month and the impact response comes back. Without it this is a
 * measurement of the model, not of the mechanism.
 */
test('private debt reprices over YEARS, and the burden lands late', () => {
  const hike = (months, years) => {
    const saved = P.PRIVATE_DEBT_REPRICING_YEARS.value;
    if (years != null) P.PRIVATE_DEBT_REPRICING_YEARS.value = years;
    try {
      const base = world({ assert: false });
      const hit = world({ assert: false });
      advance(base, 24); advance(hit, 24);
      nudge(hit, 'policy_rate', +3);
      const d = [];
      for (let m = 1; m <= months; m++) {
        advance(base, 1); advance(hit, 1);
        d.push(hit.s.default_rate - base.s.default_rate);
      }
      return { at: (m) => d[m - 1], last: hit.s, base: base.s };
    } finally { P.PRIVATE_DEBT_REPRICING_YEARS.value = saved; }
  };

  const r = hike(60);
  const instant = hike(1, 1 / 12);   // the whole book reprices every month
  const impactShare = r.at(1) / r.at(60);
  const isolation = instant.at(1) / r.at(1);

  console.log(`  a 3pp hike, default rate: m1 ${r.at(1).toFixed(5)}pp, ` +
    `m12 ${r.at(12).toFixed(5)}, m36 ${r.at(36).toFixed(5)}, m60 ${r.at(60).toFixed(5)}. ` +
    `Impact is ${(impactShare * 100).toFixed(2)}% of the five-year response ` +
    `(0.67538pp before 5.2, off the DIAL and the whole stock). ` +
    `Repricing switched off: ${instant.at(1).toFixed(5)}pp, ${isolation.toFixed(1)}x.`);

  assert.ok(impactShare < 0.02,
    `the first month delivers ${(impactShare * 100).toFixed(2)}% of the five-year ` +
    `default response. Borrowers do not all reprice in thirty days.`);
  assert.ok(r.at(36) > 2 * r.at(12),
    `the burden at three years (${r.at(36).toFixed(5)}pp) is not more than twice ` +
    `the burden at one (${r.at(12).toFixed(5)}pp). A hiking cycle bites a loan ` +
    `book for years; if it has all arrived inside a year the stock is repricing ` +
    `like new business.`);
  assert.ok(isolation > 10,
    `switching the maturity structure off (repricing in one month) changed the ` +
    `impact response by only ${isolation.toFixed(1)}x, so the shape above is not ` +
    `coming from the maturity structure and this test is measuring something else.`);
});

/**
 * THE OTHER HALF OF THE SAME DEFECT, AND IT WAS THE BIGGER HALF.
 *
 * The old line read `s.policy_rate` — the DIAL — so the default rate answered
 * the announcement rather than the transmission. Decomposed by rebuilding each
 * stage, the impact response to a 3pp hike goes 0.67538 -> 0.03160 -> 0.00125:
 * the dial read was 21x of it and the maturity structure a further 25x.
 * tools/lint.mjs's `lint-allow-dial` exception is gone with it.
 */
test('the debt-service burden reads the transmitted rate, not the dial', () => {
  const base = world({ assert: false });
  const hit = world({ assert: false });
  advance(base, 24); advance(hit, 24);
  nudge(hit, 'policy_rate', +3);
  advance(base, 1); advance(hit, 1);
  // One month after a 3pp hike the DIAL has moved 3pp and the rate borrowers
  // pay has barely moved; if the burden tracked the dial it would be most of
  // the way there.
  const dDial = hit.s.policy_rate - base.s.policy_rate;
  const dPaid = hit.s.private_debt_rate - base.s.private_debt_rate;
  assert.equal(dDial, 3);
  assert.ok(dPaid / dDial < 0.01,
    `one month after a 3pp hike the rate the private stock PAYS has moved ` +
    `${dPaid.toFixed(4)}pp, ${(dPaid / dDial * 100).toFixed(1)}% of the dial. ` +
    `Two lags stand between them — RATE_PASSTHROUGH_TO_BORROWERS to reach new ` +
    `business, then PRIVATE_DEBT_REPRICING_YEARS to reach the stock — and this ` +
    `says one of them is missing.`);
});
