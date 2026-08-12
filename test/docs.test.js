/**
 * THE DOCS ARE PART OF THE PRODUCT, SO THEY GET TESTS.
 *
 * `docs/01-variables.md` and `docs/09-interface.md` are LIVING documents:
 * they claim to describe the model and the screen as they are now. Everything
 * else in docs/ is a dated artefact of a pass and is allowed to describe the
 * past.
 *
 * Both went stale before anyone noticed. `01` listed `transfers` as a player
 * dial when it is automatic, gave `neutral_rate` as 3.0% when the model has a
 * `neutral_real_rate` of 0.5%, and documented two variables that had been
 * deleted. A design document that quietly stops matching the code is worse
 * than no design document, because people still trust it.
 *
 * These tests are deliberately shallow — they check that things are MENTIONED,
 * not that the prose is right. Prose is a human's job. Drift is a machine's.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newState } from '../src/state.js';
import { DIALS, TRANSMISSION_LABELS, PIPELINE_TARGETS } from '../src/game/dials.js';
import { INDICATORS } from '../src/game/indicators.js';
import { SCENARIOS } from '../src/game/scenarios.js';
import { EVENTS } from '../src/game/events.js';
import { ENDINGS } from '../src/game/endings.js';
import { P } from '../src/params.js';

const doc = (name) => readFileSync(new URL(`../docs/${name}`, import.meta.url), 'utf8');

test('every state field is documented in 01-variables.md', () => {
  const text = doc('01-variables.md');
  const missing = Object.keys(newState())
    .filter((k) => k !== 'history')
    .filter((k) => !text.includes(`\`${k}\``));
  assert.deepEqual(missing, [],
    'these fields exist in newState() and appear nowhere in docs/01-variables.md. ' +
    'A state variable nobody wrote down is one nobody can reason about.');
});

test('01-variables.md does not document fields the model no longer has', () => {
  // The other direction, and the one that actually bit: `wage_level` and
  // `money_supply` sat in this document for the whole life of the model after
  // being deleted from it.
  const text = doc('01-variables.md');
  const s = newState();
  const claimed = [...text.matchAll(/^\| `([a-z_0-9]+)` \| (?:STOCK|FLOW|RATE|INDEX|STATE)/gm)]
    .map((m) => m[1]);
  const ghosts = claimed.filter((k) => !(k in s));
  assert.deepEqual(ghosts, [],
    'these are documented as state variables but newState() does not produce them');
});

test('every dial, gauge, scenario, shock and ending is named in the docs', () => {
  const text = doc('01-variables.md') + doc('09-interface.md') + doc('10-state-of-the-project.md');
  const missing = [];
  for (const d of DIALS) if (!text.includes(`\`${d.key}\``)) missing.push(`dial ${d.key}`);
  for (const i of INDICATORS) if (!text.includes(i.label)) missing.push(`gauge ${i.label}`);
  for (const k of Object.keys(SCENARIOS)) if (!text.toLowerCase().includes(k.replace('_', ' '))
    && !text.includes(k)) missing.push(`scenario ${k}`);
  for (const e of EVENTS) if (!text.includes(e.name)) missing.push(`event ${e.name}`);
  for (const e of ENDINGS) if (!text.includes(e.title)) missing.push(`ending ${e.title}`);
  assert.deepEqual(missing, [],
    'everything the player can see or trigger has to be written down somewhere');
});

test('every transmitted driver has a player-facing name', () => {
  // The pipeline panel is the widget the design brief calls the most important
  // on screen. It rendered `-> policy_rate_demand` for a while, which is a
  // field name, not an explanation.
  const missing = [...PIPELINE_TARGETS].filter((t) => !TRANSMISSION_LABELS[t]);
  assert.deepEqual(missing, [],
    'these pipeline targets would render their raw field name to the player');
  const leaked = Object.values(TRANSMISSION_LABELS).filter((v) => /_/.test(v));
  assert.deepEqual(leaked, [], 'a player-facing label contains a snake_case field name');
});

test('the docs index lists every file in docs/', async () => {
  const { readdirSync } = await import('node:fs');
  const index = doc('README.md');
  const files = readdirSync(new URL('../docs/', import.meta.url))
    .filter((f) => f.endsWith('.md') && f !== 'README.md');
  const missing = files.filter((f) => !index.includes(f));
  assert.deepEqual(missing, [], 'docs/README.md is the map; an unlisted file is a lost one');
});

/**
 * A GAUGE MUST NOT SHOW THE PLAYER A THRESHOLD THE MODEL DOES NOT HOLD
 * [4th audit 5.19].
 *
 * `indicators.js` reached the player with **copies five and six** of
 * `CREDIT_GAP_WARNING` — the BIS warning line, which 5.3 promoted out of
 * `credit.js` after finding three and 5.11 found a fourth in `events.js`. And
 * the danger line was hardcoded in PROSE as "9pp" while the band beside it read
 * `CREDIT_GAP_CRISIS_THRESHOLD`, so moving that parameter would have coloured
 * the gauge against the new value and told the player the old one.
 *
 * A display that disagrees with its own threshold is the `price_level`
 * invariant's argument aimed at the screen: a gauge that drifts from the number
 * it claims to show is worse than no gauge.
 *
 * WHY A TEST AND NOT A LINT RULE. The file's other 24 literals are verdict
 * cuts, chart ranges and trend epsilons — a data table of display bands, and
 * naming them all would wreck the one file whose job is legibility. What
 * matters is not that a number is bare; it is that a number the model ALSO
 * holds is written out twice. This is the same shape as 5.10's DEMAND_BOUNDS
 * guard: assert the equality, do not police the literal.
 */
test('every gauge threshold the model also holds is the same number', () => {
  const gap = INDICATORS.find((i) => i.key === 'credit_to_gdp_gap');
  assert.ok(gap, 'the credit-gap gauge is gone');

  // Walk the band function across the boundary and read where it changes.
  const boundary = (fn, from, to, want) => {
    let lo = from, hi = to;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (fn(mid) === want) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const okToWarn = boundary(gap.band, -5, 15, 'ok');
  const warnToDanger = boundary(gap.band, okToWarn + 1e-6, 15, 'warn');

  assert.ok(Math.abs(okToWarn - P.CREDIT_GAP_WARNING.value) < 1e-6,
    `the credit-gap gauge turns from ok to warn at ${okToWarn.toFixed(6)}pp, but ` +
    `CREDIT_GAP_WARNING is ${P.CREDIT_GAP_WARNING.value}. The player is being ` +
    `shown a warning line the model does not use.`);
  assert.ok(Math.abs(warnToDanger - P.CREDIT_GAP_CRISIS_THRESHOLD.value) < 1e-6,
    `the gauge turns from warn to danger at ${warnToDanger.toFixed(6)}pp, but ` +
    `CREDIT_GAP_CRISIS_THRESHOLD is ${P.CREDIT_GAP_CRISIS_THRESHOLD.value}.`);

  // And the PROSE has to move with it. A hardcoded "9pp" beside a band that
  // reads the parameter is how this was found.
  const danger = String(P.CREDIT_GAP_CRISIS_THRESHOLD.value);
  assert.ok(gap.verdict(P.CREDIT_GAP_CRISIS_THRESHOLD.value + 1).includes(danger),
    `the danger verdict reads "${gap.verdict(P.CREDIT_GAP_CRISIS_THRESHOLD.value + 1)}" ` +
    `and does not contain ${danger}. Interpolate the parameter — a gauge that ` +
    `colours itself against one number and names another is worse than no gauge.`);
  assert.ok(gap.help.includes(danger),
    `the credit-gap help text does not mention ${danger}pp. It is the number the ` +
    `whole gauge exists to warn about.`);

  // The inflation gauge's own target.
  const infl = INDICATORS.find((i) => i.key === 'inflation');
  assert.equal(infl.badness(P.SS_INFLATION_TARGET.value), 0,
    `the inflation gauge scores ${P.SS_INFLATION_TARGET.value}% as imperfect, so ` +
    `its idea of "on target" is not SS_INFLATION_TARGET.`);
  assert.ok(infl.help.includes(String(P.SS_INFLATION_TARGET.value)),
    `the inflation gauge's help does not name the target it is measured against`);
});
