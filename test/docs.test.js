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
