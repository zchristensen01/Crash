/**
 * Ghost runs, restart-same-seed and reproducible bug reports all depend on
 * this. A single stray Math.random() in src/ silently destroys all three.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { newState } from '../src/state.js';
import { run } from '../src/engine.js';

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });
}

/** Source with comments removed — the guards below check code, not prose.
 *  Several files legitimately mention Math.random in a docstring telling you
 *  not to use it. */
function code(file) {
  return readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
}

test('no Math.random anywhere in src/', () => {
  for (const file of walk('src')) {
    const src = code(file);
    assert.ok(!/Math\.random/.test(src),
      `${file} uses Math.random — use rng.js, or ghost runs and same-seed ` +
      `restarts silently stop being reproducible`);
  }
});

test('no bare time conversion outside units.js', () => {
  for (const file of walk('src')) {
    if (file.endsWith('units.js') || file.endsWith('params.js')) continue;
    const src = code(file);
    assert.ok(!/[)\w\s]\/\s*12\b/.test(src),
      `${file} divides by 12 outside units.js. Annual->monthly is only ` +
      `linear for non-compounding flows; route it through units.js.`);
  }
});

test('same seed produces an identical 96-tick history', () => {
  const a = newState(); run(a, 96, { seed: 40317 });
  const b = newState(); run(b, 96, { seed: 40317 });
  assert.deepEqual(a, b, 'same seed diverged');
});
