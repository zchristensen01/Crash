/**
 * PARAMETER AND KERNEL TESTS — these PASS TODAY.
 * They guard the research record and the kernel calibration, both of which
 * are done. Everything else in test/ fails until its module is written.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { P, SOLVED_FROM_MODEL, START, START_DEFERRED, LAGS_MONTHS, KERNELS, KERNEL_SHAPE_K } from '../src/params.js';

const CONFIDENCE = new Set(['strong', 'moderate', 'weak', 'contested', 'judgement']);

/**
 * EVERY START FIELD IS READ, OR DECLARED IDLE [4th audit 5.6].
 *
 * The DEFERRED register covers `P` entries and NOTHING covered `START`, so a
 * starting-vector field could be carried, documented in `docs/01`, and read by
 * absolutely nothing, with no test noticing. That is exactly what had
 * happened: measured when this was written, **four of START's 36 fields were
 * dead**, and task 5.6 — the task that produced this register — named two of
 * them. `current_account` and `fx_change` were found only by counting.
 *
 * Same shape and same reasoning as DEFERRED and SOLVED_FROM_MODEL: enforced in
 * BOTH directions, because a stale register is worse than none.
 *
 * WHAT COUNTS AS WIRED, and the first attempt at this test got it wrong.
 * Counting mentions does not work: START's keys are SPREAD into `s`, so a
 * field that is never explicitly assigned appears exactly once — as its only
 * read — and a "more than one mention" rule flags `capital_output_ratio`,
 * `labour_share` and `term_premium`, all three of which are properly wired.
 *
 * A field is wired if EITHER
 *   - something READS it (it appears somewhere that is not an assignment
 *     target), or
 *   - something COMPUTES it (`s.<field> = …` in a rule or in pushHistory).
 *
 * The second clause is what makes `gdp_growth_annual` legal after 5.6: nothing
 * displays it yet — that is Phase 8.10 — but it is no longer a frozen START
 * constant, it is recomputed from the output history every tick. The failure
 * this register exists to catch is a value carried in the starting vector that
 * NOTHING EVER TOUCHES.
 */
test('every START field is read by something, or is declared idle', () => {
  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(new URL(dir, import.meta.url), { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${dir}${e.name}/`);
      else if (e.name.endsWith('.js') && e.name !== 'params.js') files.push(`${dir}${e.name}`);
    }
  })('../src/');
  const src = files
    .map((f) => readFileSync(new URL(f, import.meta.url), 'utf8'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const assigned = (k) => new RegExp(`\\bs\\.${k}\\s*(=[^=]|\\+=|-=|\\*=|/=)`).test(src);
  // A read is a mention that survives deleting every assignment TARGET.
  const read = (k) => new RegExp(`\\b${k}\\b`).test(
    src.replace(new RegExp(`\\bs\\.${k}\\s*(=[^=]|\\+=|-=|\\*=|/=)`, 'g'), ''));
  const isRead = (k) => read(k) || assigned(k);

  const deadAndUndeclared = Object.keys(START)
    .filter((k) => !isRead(k) && !(k in START_DEFERRED));
  assert.deepEqual(deadAndUndeclared, [],
    `these START fields are read by nothing and are not in parameters.py ` +
    `START_DEFERRED. A starting vector that carries values no rule consumes is ` +
    `a vector nobody can trust at a glance — wire them or say why they are idle.`);

  const declaredButRead = Object.keys(START_DEFERRED).filter(isRead);
  assert.deepEqual(declaredButRead, [],
    `these are declared idle in START_DEFERRED but something reads them. ` +
    `Delete the entry — a stale register is worse than none.`);

  for (const [k, reason] of Object.entries(START_DEFERRED)) {
    assert.ok(k in START, `START_DEFERRED lists ${k}, which is not a START field`);
    assert.ok((reason || '').trim().length > 40,
      `${k} is declared idle with no real reason. "Because it is" is how ` +
      `docs/07 L1 survived three passes.`);
  }
});

test('every parameter has a value inside its range', () => {
  for (const [name, p] of Object.entries(P)) {
    assert.ok(p.low <= p.value && p.value <= p.high,
      `${name}: ${p.value} outside [${p.low}, ${p.high}] — low/high may be inverted`);
  }
});

test('every parameter has a unit, a source and a known confidence level', () => {
  for (const [name, p] of Object.entries(P)) {
    assert.ok(p.unit?.trim(), `${name}: missing unit (always a bug)`);
    assert.ok(p.source?.trim(), `${name}: missing source`);
    assert.ok(CONFIDENCE.has(p.confidence), `${name}: bad confidence '${p.confidence}'`);
  }
});

test('the deleted double-count has not crept back', () => {
  // A hard 0% wage floor AND a 0.20 strength multiplier model one friction
  // twice. Research 1.6 resolved this; WAGE_RIGIDITY_SHARE carries it alone.
  assert.ok(!('CLASSICAL_WAGE_CORRECTION_STRENGTH' in P),
    'CLASSICAL_WAGE_CORRECTION_STRENGTH is back — see docs/02 Self-correction 4');
});

test('kernels are normalised and peak on the documented month', () => {
  for (const [channel, weights] of Object.entries(KERNELS)) {
    const total = weights.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, `${channel}: weights sum to ${total}, not 1`);

    const peak = weights.indexOf(Math.max(...weights)) + 1;
    assert.equal(peak, LAGS_MONTHS[channel],
      `${channel}: kernel peaks at month ${peak} but LAGS_MONTHS says ` +
      `${LAGS_MONTHS[channel]}. theta must be peak/(k-1), not peak/k — see ` +
      `the [PASS2 FIX] note in parameters.py.`);
  }
});

test('every fitted kernel shape has a lag entry', () => {
  for (const channel of Object.keys(KERNEL_SHAPE_K)) {
    assert.ok(channel in LAGS_MONTHS, `KERNEL_SHAPE_K['${channel}'] has no lag`);
  }
});

test('START satisfies the accounting identities', () => {
  const s = START;
  const g = (s.potential_growth + 2.0) / 100;          // nominal growth

  const interest = s.govt_debt * s.yield_10y / 100;
  const deficit = s.govt_spending + s.transfers + interest - s.tax_rate;
  assert.ok(Math.abs(deficit - s.deficit) < 1e-9,
    `budget-implied deficit ${deficit} != START.deficit ${s.deficit}`);
  assert.ok(Math.abs(deficit - s.govt_debt * g) < 1e-9,
    `deficit ${deficit} does not hold debt at ${s.govt_debt}% (needs ${s.govt_debt * g})`);

  assert.ok(Math.abs(s.policy_rate - (s.neutral_real_rate + 2.0)) < 1e-9,
    'policy rate != r* + target');
  assert.ok(Math.abs(s.yield_10y - (s.policy_rate + s.term_premium)) < 1e-9,
    'yield != policy rate + term premium');

  const iy = (0.06 + s.potential_growth / 100) * s.capital_output_ratio * 100;
  assert.ok(Math.abs(iy - s.investment_share) < 1e-9,
    `investment share ${s.investment_share}% will not hold K/Y at ` +
    `${s.capital_output_ratio} — needs ${iy.toFixed(2)}%. NB the textbook ` +
    `I = delta*K gives 18% and is the ZERO-growth case.`);

  assert.equal(s.output_gap, 0, 'a steady state has no output gap');
  assert.equal(s.credit_to_gdp_gap, 0, 'a steady state has no credit gap');
  assert.equal(s.unemployment, s.natural_unemployment, 'unemployment != natural');
});

/**
 * CONSTANTS SOLVED FROM THE MODEL ARE DECLARED, AND WHAT THAT MEANS IS STATED.
 *
 * The 4th audit brief's best unrecorded structural observation: the crash's
 * headline magnitude is pinned BY CONSTRUCTION and is no longer independent
 * evidence about the model. CRISIS_IMPULSE_AMPLIFICATION is defined as the
 * value that makes the realised trough equal CRISIS_OUTPUT_TROUGH, so
 * test/crisis.test.js asserting exactly that CANNOT FAIL ON MAGNITUDE. It is a
 * consistency check wearing a validation's clothes, and it read as the latter
 * for two passes.
 *
 * This is not a defect. Deconvolving an observation into a structural input is
 * the correct move and the alternative — feeding the observed magnitude in
 * directly — is rule 4's error. It just has to be declared, so the register is
 * enforced in both directions the way DEFERRED is: nothing may be solved from
 * the model without saying so, and nothing may claim to be without being
 * listed.
 *
 * WHAT IS ACTUALLY EVIDENCE is the residual — how much of the published
 * magnitude the model supplies BY ITSELF. That number can fail, and in this
 * audit it fell from 8.4% to 3.65%.
 */
test('every constant solved from the model is declared, in both directions', () => {
  const entries = Object.entries(SOLVED_FROM_MODEL);
  assert.ok(entries.length > 0, 'the register is empty — it should hold at least the two crisis constants');

  for (const [name, reason] of entries) {
    const p = P[name];
    assert.ok(p, `SOLVED_FROM_MODEL lists ${name}, which is not a parameter`);
    assert.ok((reason || '').trim().length > 20,
      `${name} is declared solved-from-the-model with no real reason`);
    assert.equal(p.confidence, 'judgement',
      `${name} is solved from the model but is labelled '${p.confidence}'. A ` +
      `value defined by a solve is not an estimate of anything in the world.`);
    assert.ok(/DERIVED FROM THIS MODEL/.test(p.source),
      `${name} is in the register but its source does not say so`);
  }

  // The other direction. A parameter that says it is derived from the model
  // and is NOT declared is the dangerous case: a test checking it looks like
  // validation and is not.
  const undeclared = Object.entries(P)
    .filter(([n, p]) => p && typeof p.source === 'string'
      && /DERIVED FROM THIS MODEL/.test(p.source) && !(n in SOLVED_FROM_MODEL))
    .map(([n]) => n);
  assert.deepEqual(undeclared, [],
    'these parameters say they are derived from this model but are not in ' +
    'SOLVED_FROM_MODEL. Anything solved from the model has to be declared, or ' +
    'a test that checks it reads as evidence when it is arithmetic.');
});
