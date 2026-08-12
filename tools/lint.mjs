/**
 * LINT — six static checks, no dependencies.
 *
 *     node tools/lint.mjs        (also runs as part of `npm test`)
 *
 * docs/10 lists "no CI, no lint, no type checking" under Engineering and notes
 * that JSDoc plus `tsc --checkJs` would have caught the ten undeclared state
 * fields of docs/07 M11 statically. That is true and it is also a dependency.
 * These six checks are the subset that has actually caught real bugs in this
 * project's history, written in the same zero-dependency style as everything
 * else, and each one names the finding it exists to prevent.
 *
 * They are STATIC and deliberately crude. A regex over source is not a type
 * checker; it is a tripwire on six specific mistakes that have each cost a
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

/**
 * WHERE CHECK (f) LOOKS, AND WHY IT IS NOT EVERYWHERE [4th audit 5.11].
 *
 * 5.3 took `src/rules/` from 71 undeclared literals to zero and left everything
 * else unpoliced, which is how `leverage_max`'s bare 1.35 survived to be found
 * by 5.5 instead. Measured, **253 literals sit outside `src/rules/`** — but the
 * total is the wrong number to act on, and the breakdown is:
 *
 *     53  ui/chart.js          42  game/indicators.js     10  ui/app.js
 *     49  game/scenarios.js    21  invariants.js           9  game/session.js
 *     16  game/events.js       12  game/dials.js           7  game/endings.js
 *     ...and 34 more across rng, engine, units, state, clock, trace, widgets
 *
 * ADDED: `game/endings.js` and `game/events.js`. These are the two files where
 * a bare number decides WHAT HAPPENS TO THE PLAYER — `inflation > 25` ends the
 * game, `chance: 10` decides how often a shock arrives — and 5.3's own brief
 * said to prioritise anything that decides an ENDING or a GATE.
 *
 * NOT ADDED, each for a different reason and each stated so nobody has to
 * re-derive it:
 *
 *   ui/*  (72)                presentation. A chart's axis padding is not a
 *                             coefficient and never will be.
 *   game/scenarios.js (49)    DATA, not coefficients. Its numbers are six
 *                             starting VECTORS; flagging every field would be
 *                             pure noise, and their real guard is the
 *                             internal-consistency and regime tests that
 *                             already exist (docs/07 M6, rule 6).
 *   game/indicators.js (42)   display thresholds and formatting.
 *   invariants.js (21)        almost entirely float tolerances (1e-6, 1e-9),
 *                             which are structural. Its one real band is now
 *                             DEMAND_BOUNDS, named in 5.10.
 *   game/dials.js (12)        dial ranges and steps, which ARE the player-
 *                             facing layout rather than model coefficients —
 *                             and `max: 50` is derived and documented at
 *                             length in place (2.4, re-derived 5.9).
 *   engine/rng/units/…        algorithmic constants: seeds, buffer lengths,
 *                             months per year.
 *
 * `test/` is a third scope and is deliberately still out — but 5.7 found a
 * hardcoded `0.06` in `test/params.test.js` asserting the START vector against
 * a depreciation rate the model did not use, so it is not obviously safe. See
 * open_items E6.
 */
// `game/indicators.js` IS STILL OUT, AND 5.11's REASON FOR IT WAS WRONG.
// 5.11 called it "display thresholds and formatting". Its own header opens
// "The band thresholds are economics", which is correct — and measured, it held
// COPIES FIVE AND SIX of CREDIT_GAP_WARNING plus a player-facing "9pp"
// hardcoded next to a band that read the parameter.
//
// But putting it in this check is the wrong instrument. Its 24 remaining
// literals are verdict cuts, chart ranges and trend epsilons — a DATA TABLE of
// display bands, like `scenarios.js`, and naming 24 constants would make the
// one file whose job is legibility unreadable. What the file actually needs is
// the guard 5.10 used for DEMAND_BOUNDS: assert that where a gauge shows a
// threshold the model also holds, THE TWO ARE THE SAME NUMBER. That test is in
// test/docs.test.js and it catches copy seven; this check would only have
// caught the twenty-four that are fine.
const LITERAL_SCOPE = SRC.filter((f) =>
  f.includes(`${'rules'}`) || f.endsWith('endings.js') || f.endsWith('events.js'));
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
// (f) No undeclared numeric literal in src/rules/.
//
// The check the third pass was asked for and did not write, and the reason it
// matters is the whole claim this project makes: `parameters.py` is the
// authority, every coefficient has a range, a confidence and a source. A bare
// number in a rule is a coefficient that escaped that. The fourth audit found
// three of them doing real work — `0.02` and `0.4` running the bubble loop
// (promoted in 3.2 to CREDIT_COLLATERAL_FEEDBACK and
// CREDIT_IMPULSE_RATE_SENSITIVITY) and `0.20` setting the crash meter's trend
// speed under a comment citing an HP filter it did not resemble (5.4).
//
// MEASURED AGAINST THE TREE, not against the brief: 71 occurrences across 11
// files at the time this was written. The brief's D3 counts (credit 23,
// prices 16, crisis 16) were read rather than run and two of the three are
// wrong — measured, credit 21, prices 10, and crisis **2**.
//
// THREE WAYS TO SATISFY IT, and they are the plan's own triage:
//   1. use a P.* parameter — range, confidence, source;
//   2. name it as an UPPER_SNAKE const whose comment says `judgement`, which
//      is the honest label for an absurdity bound or a smoothing speed that
//      no literature pins;
//   3. declare an exception: // lint-allow-literal: <at least 40 chars>.
//
// WHAT IT DELIBERATELY DOES NOT FLAG. Numbers inside a `trace.record(...)` are
// display — the same carve-out check (e) makes for dials — and array indices
// are not coefficients. 0, 1, 12 and 100 are structural: identity, unity,
// months in a year, and percent.
// ---------------------------------------------------------------------
{
  // Compared NUMERICALLY, not textually: `1.0` and `1` are the same number,
  // and a check that flags one and not the other is a check nobody trusts.
  const ALLOWED = new Set([0, 1, 12, 100]);
  // MULTILINE, because the marker is looked for in a BLOCK of comment lines
  // rather than in one line — `.*$` without /m only matches at end of string,
  // which silently found nothing whenever the marker was not the last line.
  const MARKER = /\/\/\s*lint-allow-literal:\s*(.*)$/m;
  for (const f of LITERAL_SCOPE) {
    const raw = read(f).split('\n');
    const src = strippedLines(read(f));
    let inTrace = 0;
    const guarded = new Set();
    src.forEach((line, i) => {
      if (/trace\.(record|note)\(/.test(line)) inTrace = 1;
      const wasTrace = inTrace;
      if (inTrace) {
        inTrace += (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
        if (inTrace <= 1 && /\)\s*;/.test(line)) inTrace = 0;
      }
      if (wasTrace) return;

      // String contents are not arithmetic. Array indices and `.at(-2)` are
      // positions, not coefficients.
      const bare = line
        .replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""').replace(/`[^`]*`/g, '``')
        .replace(/\.(at|slice|splice)\([^)]*\)/g, '.$1()')
        .replace(/\[\s*-?\d+\s*\]/g, '[]');

      const found = [...bare.matchAll(/(?<![\w.$])(\d+(?:\.\d+)?(?:e-?\d+)?)/g)]
        .map((m) => m[1]).filter((v) => !ALLOWED.has(Number(v)));
      if (!found.length) return;

      // The contiguous comment block immediately above, plus any trailing
      // comment on the line itself — a one-word label rarely needs two lines.
      const own = raw[i] || '';
      let block = own.includes('//') ? own.slice(own.indexOf('//')) : '';
      for (let j = i - 1; j >= 0 && /^\s*(\/\/|\*|\/\*)/.test(raw[j] || ''); j--) {
        block += '\n' + raw[j];
      }
      const marker = block.match(MARKER);
      if (marker) {
        guarded.add(i);
        if ((marker[1] || '').trim().length < 40) {
          fail(f, `line ${i + 1} has a lint-allow-literal marker with no real ` +
                  `reason. "Because it is" is how docs/07 L1 survived three passes.`);
        }
        return;
      }
      // A NAMED constant with an explicit `judgement` label is the plan's
      // second branch: the number is not sourced and says so.
      if (/^\s*const\s+[A-Z][A-Z0-9_]*\s*=/.test(bare) && /judgement/i.test(block)) return;

      fail(f, `line ${i + 1} has the bare numeric literal${found.length > 1 ? 's' : ''} ` +
              `${found.join(', ')}: ${line.trim()}\n` +
              `    A coefficient in a rule needs a range, a confidence and a source in\n` +
              `    parameters.py — or an UPPER_SNAKE name with an explicit "judgement"\n` +
              `    comment if nothing pins it — or // lint-allow-literal: <why>.`);
    });
    // The other direction, as with lint-allow-dial: a marker guarding a line
    // that no longer has a literal is a stale register, and a stale register
    // is worse than none.
    raw.forEach((line, i) => {
      if (!MARKER.test(line)) return;
      // A marker trailing the guarded statement itself.
      if (guarded.has(i)) return;
      // Otherwise it is a comment line: walk down to the first line of code
      // and ask whether THAT is the one the marker was recorded against.
      let j = i;
      while (j < raw.length && /^\s*(\/\/|\*|\/\*)/.test(raw[j])) j++;
      if (!guarded.has(j)) {
        fail(f, `line ${i + 1} has a stale lint-allow-literal marker — the statement ` +
                `it guards (line ${j + 1}) has no bare literal. Delete it.`);
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
console.log(`lint: clean (${SRC.length} files, 6 checks; ` +
            `${LITERAL_SCOPE.length} in the literal scope)`);
