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
import { citedIn } from './citations.mjs';
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

/**
 * BOTH ARMS OF A DELIBERATELY ASYMMETRIC CHANNEL [4th audit 5.14, open_items B8].
 *
 * `MONETARY_ASYMMETRY_RATIO` makes cuts transmit at 1/1.5 of hikes, on purpose
 * and with a source. Both monetary targets used to be measured by shocking
 * with a HIKE and negating — one arm of a channel the model is built to make
 * asymmetric — and compared against published estimates that are identified
 * across both directions. That is not like-for-like, and for
 * `RATE_TO_INFLATION` THE CHOICE OF ARM DECIDED THE VERDICT: 0.0795 on the
 * hike arm against a published 0.2-0.4, and 0.2230 on the cut arm, inside it.
 * `RATE_TO_OUTPUT` passes either way, which is why nobody looked.
 *
 * So both arms are measured and the AVERAGE is asserted, with both arms and
 * their ratio reported. Switching to the arm that passes would be tuning, and
 * 5.14 found a second reason it would have been worse than that — see the
 * `RATE_TO_INFLATION` message below.
 */
function bothArms({ months, field }) {
  const of = (dir) => -dir * compare({
    taylor: false, shock: (w) => nudge(w, 'policy_rate', dir), months })[field];
  const hike = of(+1), cut = of(-1);
  return { hike, cut, average: (hike + cut) / 2, ratio: hike / cut };
}
const reportArms = (a, p) =>
  `model ${a.average.toFixed(3)} averaged over both arms ` +
  `(hike ${a.hike.toFixed(4)}, cut ${a.cut.toFixed(4)}, hike/cut ${a.ratio.toFixed(2)}), ` +
  `literature ${p.low}-${p.high}`;

test('RATE_TO_OUTPUT: 1pp of policy rate, held a year, measured on both arms', () => {
  const a = bothArms({ months: 12, field: 'dOutput' });
  // The realised asymmetry is 1.35, not the declared 1.5, because
  // MONETARY_ASYMMETRY_RATIO scales the easing channel and the other routes
  // from the rate to output are symmetric. Reported, not asserted: pinning it
  // would be asserting a number nothing sources.
  assert.ok(inRange(a.average, P.RATE_TO_OUTPUT), reportArms(a, P.RATE_TO_OUTPUT));
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
    'months against the 0.122 recorded before. ' +
    'RE-MEASURED AFTER 5.7, AND IT HALVED: 0.0413 at 12 months, 0.0797 at 24, ' +
    '0.1069 at 36, 0.1271 at 48, where 4.4 measured 0.0586 / 0.1227 / 0.1756 / ' +
    '0.2192 and the 48-month figure was INSIDE the published band. That is not ' +
    'a regression in the rate channel. 5.7 fixed a unit error in the capital ' +
    'law of motion, so potential output now grows at the rate it is told to ' +
    'rather than decaying toward 0.93%/yr — a hike used to be measured against ' +
    'a ceiling that was itself sagging, which flattered the disinflation. ' +
    'MEASURED ON BOTH ARMS SINCE 5.14, AND THE AVERAGE IS ASSERTED: hike 0.0795, ' +
    'cut 0.2230, average 0.1513 at 24 months. Across horizons the average runs ' +
    '0.0704 / 0.1513 / 0.2170 / 0.2722 at 12 / 24 / 36 / 48, so it enters the ' +
    'published band at three years. The test used to shock with a hike and ' +
    'negate — ONE arm of a channel MONETARY_ASYMMETRY_RATIO makes asymmetric on ' +
    'purpose — against a published range identified across both directions, and ' +
    'for this target the choice of arm decided the verdict. ' +
    'THE CUT ARM IS NOT A SECOND OPINION, AND THIS MESSAGE USED TO SAY IT WAS. ' +
    'It claimed "monetaryEasingScale is why they differ". REFUTED by switching ' +
    'the kink off: with WAGE_PC_KINK unreachable the hike arm does not move at ' +
    'all (0.0795 — it never crossed) and the cut arm falls 0.2230 to 0.0616, so ' +
    'the ratio goes 0.357 to 1.292 and the asymmetry flips into the direction ' +
    'monetaryEasingScale actually implies, cuts WEAKER. The cut arm\'s 0.2230 is ' +
    'one kink crossing: it is the only arm that goes from below potential to ' +
    'above it, taking unemployment under WAGE_PC_KINK onto the steep branch of ' +
    'the wage curve. Sweeping the starting gap, hike/cut is 1.138 / 1.000 / ' +
    '1.115 at -6 / -4 / -2, then 0.357 at 0 and 0.984 at +2 — the asymmetry ' +
    'exists at exactly one starting point, and the harness settles to it. ' +
    'docs/11 section 3 already records that the gap-zero row shows more ' +
    'inflation than its neighbours for every lever, for this reason. ' +
    'So switching arms would not merely be tuning to pass; it would be ' +
    'reporting a kink crossing as the response to easing. ' +
    'The window is doing as much of the disagreement as the model is. ' +
    'What is left is the anchored Phillips slope doing exactly what docs/02 ' +
    'says it should: with kappa at 0.05 the demand channel barely moves prices, ' +
    'and real surges are supposed to come from supply shocks and unanchoring. ' +
    'The published range is estimated across regimes that include the ' +
    'unanchored 1970s. The slowness no longer lives in the RATE — that arrives ' +
    'in a quarter now — it lives in the investment partial adjustment and the ' +
    'Phillips curve. Do not raise kappa to close this.',
}, () => {
  const a = bothArms({ months: 24, field: 'dInflation' });
  assert.ok(inRange(a.average, P.RATE_TO_INFLATION), reportArms(a, P.RATE_TO_INFLATION));
});

/**
 * WHY THE CUT ARM IS NOT A SECOND OPINION [4th audit 5.14, open_items B8].
 *
 * B8 says switching to the cut arm would be tuning to pass. It is worse than
 * that, and the isolating experiment says so: the cut arm's 0.2230 is almost
 * entirely ONE KINK CROSSING, not the model's response to easing.
 *
 * Sweeping the starting gap, the asymmetry exists at exactly one point:
 *
 *   starting gap   -6      -4      -2       0      +2
 *   hike/cut      1.138   1.000   1.115   0.357   0.984
 *
 * and at gap 0 the cut arm ends at +0.49 — it is the only arm that crosses
 * from below potential to above it, i.e. takes unemployment under
 * WAGE_PC_KINK and onto the steep branch of the wage curve. docs/11 §3 already
 * records that the gap-zero row shows more inflation than its neighbours for
 * EVERY lever, for this reason.
 *
 * Proved by removing the kink rather than by argument: with WAGE_PC_KINK
 * unreachable the hike arm does not move at all (0.0795, it never crossed) and
 * the cut arm falls 0.2230 -> 0.0616, so the ratio goes 0.357 -> 1.292 and the
 * asymmetry flips into the direction MONETARY_ASYMMETRY_RATIO declares.
 *
 * THE VALIDATION HARNESS MEASURES FROM A SETTLED STEADY STATE, WHICH IS
 * EXACTLY THE KINK. That is the one starting state where the two arms are not
 * symmetric perturbations of the same economy, and it is the default.
 */
test('the two arms straddle the wage kink, which is why they disagree', () => {
  const withKink = bothArms({ months: 24, field: 'dInflation' });
  const saved = P.WAGE_PC_KINK.value;
  let without;
  try { P.WAGE_PC_KINK.value = 0; without = bothArms({ months: 24, field: 'dInflation' }); }
  finally { P.WAGE_PC_KINK.value = saved; }

  console.log(`  RATE_TO_INFLATION @24m — hike ${withKink.hike.toFixed(4)}, ` +
    `cut ${withKink.cut.toFixed(4)}, average ${withKink.average.toFixed(4)}; ` +
    `with the wage kink unreachable the cut arm is ${without.cut.toFixed(4)}`);

  // The hike arm never reaches the kink, so removing it must not move that arm.
  assert.ok(Math.abs(withKink.hike - without.hike) < 1e-9,
    `removing WAGE_PC_KINK moved the HIKE arm ${withKink.hike} -> ${without.hike}. ` +
    `A hike pushes unemployment UP, away from the kink, so if this moves then ` +
    `the explanation below is wrong and the asymmetry is something else.`);
  // And it must account for most of the gap between the arms.
  const explained = (withKink.cut - without.cut) / (withKink.cut - withKink.hike);
  assert.ok(explained > 0.8,
    `the wage kink explains only ${(explained * 100).toFixed(0)}% of the gap between ` +
    `the two arms (cut ${withKink.cut.toFixed(4)} -> ${without.cut.toFixed(4)} against a ` +
    `hike arm of ${withKink.hike.toFixed(4)}). B8's message says it is the kink; ` +
    `re-derive rather than leaving a mechanism claimed and unsupported.`);
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
  todo: 'KNOWN. A 1% of GDP tax rise costs 0.484% of output over 30 months ' +
        'against a published 2.0-3.0. (This message said ~0.33% until Phase 5 ' +
        'verification re-ran it and 0.487 until 5.12 did: it was 0.487 from 3.1 ' +
        'until 5.7 fixed the capital law of motion, 0.492 before that, and 0.33 ' +
        'was never right in this pass. The assertion three lines below printed ' +
        '0.484 while this message said 0.487 — one test, one measurement, two ' +
        'numbers, which is what the citation register now prevents.) ' +
        'The Romer-Romer narrative multiplier is ' +
        'the largest in the literature and famously larger than structural ' +
        'models produce; the model also has a responding central bank and a ' +
        'crowding-out term that works in the opposite direction on a tax rise. ' +
        'Recorded rather than closed: reproducing 2.5 would mean roughly ' +
        'tripling the consumption response to disposable income, which the ' +
        'MPC evidence does not support.',
}, () => {
  assert.ok(inRange(taxShockToGdp(), P.TAX_SHOCK_TO_GDP),
            report(taxShockToGdp(), P.TAX_SHOCK_TO_GDP));
});

/**
 * The output cost of a 1% of GDP tax rise over 30 months. Extracted so the
 * `todo` above and the citation test below measure it once — the two used to
 * be one expression and one hand-typed number, and they disagreed: the todo
 * message said 0.487 while the assertion beside it printed 0.484, in the same
 * test's output, which `report.mjs` publishes verbatim.
 */
function taxShockToGdp() {
  const r = compare({ shock: (w) => nudge(w, 'tax_rate', +1), months: 30 });
  return -r.dOutput / r.base.output * 100;
}

/**
 * DECLARED CITATIONS [5.12, open_items E4]. A HARD test: the `todo` above
 * fails by design, so a check inside it could never report (open_items E10).
 */
test('CITED: TAX_SHOCK_TO_GDP\'s model value says the same thing everywhere', () => {
  citedIn("TAX_SHOCK_TO_GDP's measured value", taxShockToGdp().toFixed(3), [
    { file: 'open_items.md', near: /^\| `TAX_SHOCK_TO_GDP` \|/, what: "A2's table" },
    { file: 'TASKS.md', near: /^\| `TAX_SHOCK_TO_GDP` \|/, what: "Phase 11's table" },
    { file: 'test/validation.test.js', near: /tax rise costs [\d.]+% of output over 30 months/,
      what: "this file's own todo message" },
  ]);
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
