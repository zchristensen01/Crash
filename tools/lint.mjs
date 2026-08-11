/**
 * LINT — five static checks, no dependencies.
 *
 *     node tools/lint.mjs        (also runs as part of `npm test`)
 *
 * docs/10 lists "no CI, no lint, no type checking" under Engineering and notes
 * that JSDoc plus `tsc --checkJs` would have caught the ten undeclared state
 * fields of docs/07 M11 statically. That is true and it is also a dependency.
 * These five checks are the subset that has actually caught real bugs in this
 * project's history, written in the same zero-dependency style as everything
 * else, and each one names the finding it exists to prevent.
 *
 * They are STATIC and deliberately crude. A regex over source is not a type
 * checker; it is a tripwire on five specific mistakes that have each cost a
 * pass. Where a check cannot be sure, it stays quiet rather than crying wolf —
 * a linter nobody trusts gets switched off.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = (file, msg) => problems.push(`${relative(ROOT, file)}: ${msg}`);

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

/** Source with comments stripped — a name that appears only in prose is not a read. */
const stripped = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

/**
 * The same, but LINE-PRESERVING, so an index into the result indexes the same
 * line of the original file. Checks that report a line number, or that look at
 * the line above, need this — stripping block comments outright collapses the
 * file and every reported line number is wrong by however many comment lines
 * preceded it.
 */
function strippedLines(src) {
  const out = [];
  let inBlock = false;
  for (let line of src.split('\n')) {
    if (inBlock) {
      const end = line.indexOf('*/');
      if (end === -1) { out.push(''); continue; }
      line = line.slice(end + 2);
      inBlock = false;
    }
    line = line.replace(/\/\*.*?\*\//g, '');
    const open = line.indexOf('/*');
    if (open !== -1) { inBlock = true; line = line.slice(0, open); }
    out.push(line.replace(/(^|[^:])\/\/.*$/, '$1'));
  }
  return out;
}

const SRC = walk(join(ROOT, 'src')).filter((f) => !f.endsWith('params.js'));
const RULES = SRC.filter((f) => f.includes(`${'rules'}`));
const read = (f) => readFileSync(f, 'utf8');

// ---------------------------------------------------------------------
// (a) Every `s.<field>` a rule READS exists in newState().
//
// docs/07 M11 found ten state fields that rules read and newState never
// declared. `undefined` in arithmetic is NaN, and NaN propagates silently
// until an invariant catches it several rules later, by which point every
// downstream variable is NaN and the origin is invisible. One of them —
// interest_cost, read by updateBondYield two rules before updateBudget writes
// it — survived only because `NaN > 0.25` is false.
// ---------------------------------------------------------------------
{
  const stateSrc = read(join(ROOT, 'src/state.js'));
  const declared = new Set([...stateSrc.matchAll(/\bs\.([a-z_][a-z0-9_]*)\s*=/gi)]
    .map((m) => m[1]));
  // START's keys are spread into `s` and count as declared.
  const paramsSrc = read(join(ROOT, 'src/params.js'));
  const startBlock = paramsSrc.match(/export const START = \{[\s\S]*?\n\};/);
  if (startBlock) {
    for (const m of startBlock[0].matchAll(/"([a-z_][a-z0-9_]*)"\s*:/gi)) declared.add(m[1]);
  }
  // Fields a rule assigns are declared by that assignment as far as the NEXT
  // rule is concerned; the check is about fields nothing ever writes.
  for (const f of SRC) {
    for (const m of stripped(read(f)).matchAll(/\bs\.([a-z_][a-z0-9_]*)\s*=/gi)) {
      declared.add(m[1]);
    }
  }
  for (const f of RULES) {
    for (const m of stripped(read(f)).matchAll(/\bs\.([a-z_][a-z0-9_]*)\b/gi)) {
      if (!declared.has(m[1])) {
        fail(f, `reads s.${m[1]}, which newState() never declares. undefined in ` +
                `arithmetic is a NaN that surfaces several rules later (docs/07 M11).`);
      }
    }
  }
}

// ---------------------------------------------------------------------
// (b) No Math.random anywhere in src/.
//
// Determinism is load-bearing: ghost runs and same-seed restarts depend on a
// byte-identical 96-month history. src/rng.js is the only source of randomness.
// ---------------------------------------------------------------------
for (const f of SRC) {
  if (/Math\.random/.test(stripped(read(f)))) {
    fail(f, 'uses Math.random. Determinism is load-bearing — use src/rng.js.');
  }
}

// ---------------------------------------------------------------------
// (c) No bare `/ 12` outside units.js.
//
// The monthly/annual conversion is the classic macro modelling bug, and
// units.js exists so there is exactly one place it can be got wrong. It also
// documents WHICH conversion applies: compounding for rates, linear for stock
// accounting, and picking the wrong one moves the model's fixed point off the
// documented steady state.
// ---------------------------------------------------------------------
for (const f of SRC) {
  if (f.endsWith('units.js')) continue;
  const src = stripped(read(f));
  for (const line of src.split('\n')) {
    // `/ 12` used as a divisor, but not `1 / 12` inside a Math.pow exponent
    // (a compounding root, which is the correct idiom) and not a comment.
    if (/\/\s*12\b/.test(line) && !/Math\.pow|MONTHS_PER_YEAR/.test(line)) {
      fail(f, `has a bare "/ 12": ${line.trim()}\n    Use units.js — ` +
              `annualToMonthlyFlow, annualRateToMonthlyLinear or ` +
              `annualToMonthlyCompound. Which one is a modelling decision.`);
    }
  }
}

// ---------------------------------------------------------------------
// (d) No rule assigns to a PIPELINE_TARGETS field.
//
// docs/07 L1, the largest defect the audit found: the pipeline scheduled into
// `consumption` and `investment`, which their rules recompute from scratch a
// few lines later, so every scheduled effect was silently discarded and the
// model had NO LAGS AT ALL. engine.js throws if anything schedules into a
// non-target; this is the other direction.
// ---------------------------------------------------------------------
{
  const dialsSrc = read(join(ROOT, 'src/game/dials.js'));
  const block = dialsSrc.match(/PIPELINE_TARGETS = new Set\(\[([\s\S]*?)\]\)/);
  const targets = block
    ? [...block[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
    : [];
  if (!targets.length) fail(join(ROOT, 'src/game/dials.js'), 'PIPELINE_TARGETS could not be parsed');
  for (const f of RULES) {
    const src = stripped(read(f));
    for (const t of targets) {
      if (new RegExp(`\\bs\\.${t}\\s*(=[^=]|\\+=|-=|\\*=)`).test(src)) {
        fail(f, `assigns to s.${t}, which is a TRANSMITTED DRIVER. A rule that ` +
                `writes one overwrites the lag before it can act — that is docs/07 ` +
                `L1, and it removed every lag in the model.`);
      }
    }
  }
}

// ---------------------------------------------------------------------
// (e) No rule reads a DIAL where a transmitted driver exists.
//
// docs/12 L3 and L5. Two rules read s.policy_rate — the slider — to decide how
// a mechanism behaves, which handed the player an INSTANTANEOUS change in the
// structure of the economy. Both inverted a lesson: crowding out switched off
// one month after dragging the slider, and hiking at the lower bound RAISED
// output for two quarters. Displaying the dial inside a trace is still fine,
// and is the whole point of the pipeline panel.
// ---------------------------------------------------------------------
// An exception must be DECLARED, with a reason, on the line above:
//     // lint-allow-dial: <at least 40 characters saying why>
// Enforced in BOTH directions, like parameters.py's DEFERRED register: an
// allow marker on a line that no longer reads a dial is itself a failure,
// because a stale register is worse than none.
{
  const DIALS_WITH_DRIVERS = ['policy_rate', 'tax_rate'];
  const MARKER = /\/\/\s*lint-allow-dial:\s*(.*)$/;
  for (const f of RULES) {
    const raw = read(f).split('\n');
    const src = strippedLines(read(f));
    let inTrace = 0;
    src.forEach((line, i) => {
      // Crude scope tracking: anything inside a trace.record(...) call is
      // display, not arithmetic, and showing the dial next to the transmitted
      // rate is the entire point of the pipeline panel.
      if (/trace\.(record|note)\(/.test(line)) inTrace = 1;
      if (inTrace) {
        inTrace += (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
        if (inTrace <= 1 && /\)\s*;/.test(line)) inTrace = 0;
        return;
      }
      const reads = DIALS_WITH_DRIVERS.filter((d) => new RegExp(`\\bs\\.${d}\\b(?!_)`).test(line));
      // The marker may be anywhere in the CONTIGUOUS COMMENT BLOCK immediately
      // above, because a reason worth writing rarely fits on one line.
      let marker = null;
      for (let j = i - 1; j >= 0 && /^\s*(\/\/|\*|\/\*)/.test(raw[j] || ''); j--) {
        const m = (raw[j] || '').match(MARKER);
        if (m) { marker = m; break; }
      }
      if (reads.length && !marker) {
        fail(f, `line ${i + 1} reads the DIAL s.${reads[0]} in arithmetic: ${line.trim()}\n` +
                `    Rules read the transmitted driver, never the slider (docs/12 L3, L5).\n` +
                `    If this one is genuinely about the announced setting, say so on the\n` +
                `    line above: // lint-allow-dial: <why>`);
      }
      if (reads.length && marker && (marker[1] || '').trim().length < 40) {
        fail(f, `line ${i + 1} has a lint-allow-dial marker with no real reason. ` +
                `"Because it is" is how docs/07 L1 survived three passes.`);
      }
    });
    // The other direction: a marker whose comment block is not followed by a
    // dial read is stale, and a stale register is worse than none.
    raw.forEach((line, i) => {
      if (!MARKER.test(line)) return;
      let j = i + 1;
      while (j < raw.length && /^\s*(\/\/|\*|\/\*)/.test(raw[j])) j++;
      const guarded = src[j] || '';
      if (!DIALS_WITH_DRIVERS.some((d) => new RegExp(`\\bs\\.${d}\\b(?!_)`).test(guarded))) {
        fail(f, `line ${i + 1} has a stale lint-allow-dial marker — the statement it ` +
                `guards (line ${j + 1}) no longer reads a dial. Delete it.`);
      }
    });
  }
}

// ---------------------------------------------------------------------
if (problems.length) {
  console.error(`lint: ${problems.length} problem${problems.length > 1 ? 's' : ''}\n`);
  for (const p of problems) console.error(`  ${p}\n`);
  process.exit(1);
}
console.log(`lint: clean (${SRC.length} files, 5 checks)`);
