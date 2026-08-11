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

test('the DEFERRED register matches the code, in both directions', () => {
  const src = sourceOfRules();
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
  todo: 'KNOWN AND ARGUABLY CORRECT. A 1pp hike moves inflation ~0.12pp at 24 ' +
        'months against a published 0.2-0.4. This is the anchored Phillips ' +
        'slope doing exactly what docs/02 says it should: with kappa at 0.05 ' +
        'the demand channel barely moves prices, and real surges are supposed ' +
        'to come from supply shocks and unanchoring. The published range is ' +
        'estimated across regimes that include the unanchored 1970s. Do not ' +
        'raise kappa to close this.',
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
  todo: 'KNOWN. A 1% of GDP tax rise costs ~0.33% of output over 30 months ' +
        'against a published 2.0-3.0. The Romer-Romer narrative multiplier is ' +
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

test('PRIVATE debt reprices instantly, and government debt no longer does', {
  todo: 'RECORDED, NOT FIXED (docs/12, E1). credit.js computes the debt-service ' +
    'burden as private_credit * (policy_rate + credit_spread) / 100 — the DIAL, ' +
    'and the whole stock. That is exactly the error the government\'s interest ' +
    'bill carried until DEBT_AVERAGE_MATURITY_YEARS was added this pass: every ' +
    'mortgage and every corporate loan is floating-rate with no lag, so the ' +
    'default rate responds to a rate move the month it is announced. The ' +
    'asymmetry is now visible and odd — the state refinances over seven years ' +
    'while its households refinance overnight. Fixing it needs a private-debt ' +
    'maturity parameter with its own source (the fixed/floating mix differs ' +
    'enormously across countries, which is most of why the 2022 hiking cycle ' +
    'hurt the UK and Australia so much more than the US), so it is a modelling ' +
    'change rather than a keystroke. tools/lint.mjs holds the exception with a ' +
    'declared reason so it cannot be forgotten.',
}, () => {
  // A rate move must not move the default rate on impact.
  const base = world({ assert: false });
  const hit = world({ assert: false });
  advance(base, 24); advance(hit, 24);
  nudge(hit, 'policy_rate', +3);
  advance(base, 1); advance(hit, 1);
  const dDefault = hit.s.default_rate - base.s.default_rate;
  assert.ok(Math.abs(dDefault) < 1e-4,
    `a 3pp hike moved the default rate ${dDefault.toFixed(5)}pp in its FIRST month. ` +
    `Borrowers do not all reprice in thirty days.`);
});
