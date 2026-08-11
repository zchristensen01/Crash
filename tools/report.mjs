/**
 * REPORT — collect everything the model measures into one readable file.
 *
 *     node tools/report.mjs          writes TEST-RESULTS.md in the repo root
 *
 * WHY THIS EXISTS. The test suite already measures a great deal and prints the
 * numbers, but it prints them into a TAP stream that scrolls past, and the most
 * valuable output — the `todo` messages carrying the measured value of every
 * disagreement with the literature — is the part most likely to be lost. This
 * gathers all of it into one self-contained document, with an explanation of
 * what each block is and what it means, so it can be read cold by somebody who
 * has never seen the project.
 *
 * IT REPORTS FAILURES AND DISAGREEMENTS IN FULL, deliberately. A results file
 * that only shows the parts that pass is marketing. The eleven `todo` entries
 * are the most important content here, not an embarrassment to be summarised
 * away: each is a place the model disagrees with published evidence, recorded
 * with its number rather than tuned away.
 *
 * Regenerate after any change to a rule. It is cheap — about two seconds.
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Run a command, return stdout+stderr, never throw — a failing suite is data. */
function run(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
                           maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    return `${e.stdout || ''}${e.stderr || ''}`;
  }
}

// ---------------------------------------------------------------------
// Parse the TAP stream into something a human can read.
// ---------------------------------------------------------------------
function parseTap(tap) {
  const lines = tap.split('\n');
  const results = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^(not ok|ok) (\d+) - (.*)$/);
    if (m) {
      const todoIdx = m[3].indexOf(' # TODO ');
      current = {
        ok: m[1] === 'ok',
        n: Number(m[2]),
        name: todoIdx === -1 ? m[3] : m[3].slice(0, todoIdx),
        todo: todoIdx === -1 ? null : m[3].slice(todoIdx + 8),
        error: null,
        file: null,
      };
      results.push(current);
      continue;
    }
    if (!current) continue;
    const loc = line.match(/^\s*location: '(.+)'/);
    if (loc) current.file = loc[1].replace(/^.*\/Crash\//, '').replace(/:\d+:\d+$/, '');
    const err = line.match(/^\s*error: '(.*)'$/);
    if (err && !current.error) current.error = err[1];
    // Multi-line error bodies come through as a YAML block scalar.
    if (/^\s*error: \|-?$/.test(line)) current.error = '(multi-line, see below)';
  }
  return results;
}

/** Group by the file each test came from, preserving order. */
function byFile(results) {
  const groups = new Map();
  for (const r of results) {
    const key = r.file || 'unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  return groups;
}

const FILE_NOTES = {
  'test/episodes.test.js':
    'HISTORICAL EPISODES. The only tests here that can say the model is WRONG rather ' +
    'than merely self-consistent: they feed it the ACTUAL policy path of a real ' +
    'episode and check the arc. THE MODEL FAILS ALL FOUR AND FAILS THEM THE SAME ' +
    'WAY — read the last two entries in this section first. This is the most ' +
    'important block in the file.',
  'test/crisis.test.js':
    'THE CRASH CHAIN. Rebuilt in docs/12: two published numbers were being used as ' +
    'structural inputs when they are OBSERVATIONS that already contain the model\'s ' +
    'own response, so the model reproduced that response on top of them and the ' +
    'crash came out 2.6x too deep.',
  'test/transmission.test.js':
    'THE CONDITIONALS THE GAME EXISTS TO TEACH. Statements about how a response ' +
    'CHANGES with the state, so each needs two measurements or a sweep. Six of these ' +
    'ran backwards before the docs/07 audit and every one passed the suite of the day.',
  'test/multipliers.test.js':
    'MULTIPLIERS, measured against published reduced forms that are NOT model terms. ' +
    'Where the model lands outside a range that is a finding, not a number to tune.',
  'test/validation.test.js':
    'EVERY PUBLISHED VALIDATION TARGET is either asserted here or recorded as a todo ' +
    'with its measured value. Also checks that the DEFERRED register of deliberately ' +
    'unread parameters matches the code in BOTH directions.',
  'test/irf.test.js':
    'IMPULSE RESPONSE SHAPES. Move a dial, hold it a year, put it back, difference ' +
    'against an untouched baseline. This is what a published VAR IRF is, and it is ' +
    'the only experiment here that can produce a months-to-peak number — everything ' +
    'else in the project measures PERMANENT held moves, which cannot peak.',
  'test/paths.test.js':
    'POLICY PATHS, NOT HELD MOVES. Real policy is a path — hike, hold, regret, cut — ' +
    'and none of that sequencing had ever been tested.',
  'test/scenarios.test.js':
    'SCENARIOS. Each must be internally consistent, survivable by SOME policy, and ' +
    'DRIVEN rather than asserted.',
  'test/events.test.js':
    'SHOCKS. Every event must touch only fields no rule recomputes, and none may be ' +
    'invisible to the player.',
  'test/steady-state.test.js':
    'THE MILESTONE TEST. 200 ticks of no input and nothing drifts. A model that will ' +
    'not sit still is unplayable, and every bug you find later is that bug.',
  'test/stability.test.js':
    'LOCAL STABILITY around the steady state, and the deliberately unbalanced loops.',
  'test/conservation.test.js':
    'THE ACCOUNTING IDENTITIES, asserted on every tick of long violent runs.',
  'test/lags.test.js':
    'THE LAG PIPELINE. A scheduled effect must actually reach demand — it did not, ' +
    'for three passes (docs/07 L1).',
  'test/determinism.test.js':
    'DETERMINISM. Same seed, byte-identical 96-month history. Ghost runs depend on it.',
  'test/docs.test.js':
    'THE DOCS ARE TESTED. Every state field must be documented; every docs file must ' +
    'be in the index.',
  'test/params.test.js': 'PARAMETER FILE INTEGRITY — ranges, units, sources, confidence levels.',
  'test/bundle.test.js': 'THE BUILD. One self-contained index.html, no dependencies.',
  'test/ui-smoke.test.js': 'THE INTERFACE, headless: every gauge opens, every panel renders.',
};

// ---------------------------------------------------------------------
console.error('running the test suite...');
const tap = run('npm run params --silent >/dev/null 2>&1; node --test --test-reporter=tap test/*.test.js');
const results = parseTap(tap);
const pass = results.filter((r) => r.ok && !r.todo).length;
const todo = results.filter((r) => r.todo).length;
const fail = results.filter((r) => !r.ok && !r.todo).length;

console.error('running the linter...');
const lint = run('node tools/lint.mjs').trim();

console.error('regenerating the cause-and-effect measurements...');
const causeEffect = run('node tools/cause-effect.mjs');

const out = [];
const w = (s = '') => out.push(s);

w('# TEST RESULTS — CRASH');
w();
w('> **GENERATED FILE.** Regenerate with `node tools/report.mjs`. Do not hand-edit.');
w('> Everything below is the output of running the model, not a description of it.');
w();
w('This file exists so the full measured behaviour of the model can be read in one');
w('place, including the parts that disagree with published evidence. It is written');
w('to be readable cold, by someone who has never seen the project.');
w();
w('---');
w();
w('## How to read this');
w();
w('The model is a monthly macroeconomic simulation: 23 rules, ~126 sourced');
w('parameters, five policy dials, 96 monthly ticks. Every parameter carries a');
w('plausible range, a confidence level and a citation.');
w();
w('**There are three kinds of result below, and the third is the important one.**');
w();
w('| | meaning |');
w('|---|---|');
w('| `PASS` | the model does what the evidence says it should |');
w('| `FAIL` | a genuine regression. There should be none. |');
w('| `OPEN` | **a measured disagreement with published evidence, recorded rather than tuned away.** The message carries the number. |');
w();
w('The `OPEN` entries are the substance of this file. The project\'s standing rule');
w('is that where the model disagrees with the literature, that is a *finding to');
w('surface, not a coefficient to move* — so each disagreement is written as a test');
w('that fails by design and prints its measured value on every run. A result file');
w('that only showed the passing parts would be marketing.');
w();
w('---');
w();
w('## Summary');
w();
w('| | |');
w('|---|---|');
w(`| Tests | **${results.length}** |`);
w(`| Passing | **${pass}** |`);
w(`| Failing (regressions) | **${fail}** |`);
w(`| Open disagreements (\`OPEN\`) | **${todo}** |`);
w(`| Linter | ${lint.startsWith('lint: clean') ? '**clean**' : '**PROBLEMS — see below**'} |`);
w();
if (fail > 0) {
  w('> **There are genuine failures in this run.** They are listed first below.');
  w();
}
w('```');
w(lint);
w('```');
w();
w('---');
w();
w('## THE HEADLINE FINDING');
w();
w('Fed the actual policy paths of US 2008-12, US 2021-23, UK 1979-83 and Japan');
w('1995-2005, **the model fails all four historical episodes, and it fails them the');
w('same way.**');
w();
w('**It does not disinflate gradually. It either stabilises or diverges, with a');
w('two-percentage-point knife-edge between them and nothing in between** — and real');
w('economies live in between. Measured, from 8% inflation and 7% expected, moving');
w('the policy rate in one step:');
w();
w('| policy rate | inflation at month 60 |');
w('|---|---|');
w('| 5% | 471.7% |');
w('| 7% | **217.6%** |');
w('| 9% | **0.69%** |');
w('| 15% | -4.00% |');
w();
w('And the *path* to a destination flips the outcome as surely as the destination:');
w('15% reached immediately produces deflation; the same 15% reached over 24 months');
w('produces 250%.');
w();
w('**The mechanism.** Demand responds to the REAL user cost; expectations are formed');
w('entirely from realised inflation; and the transmitted policy rate takes about');
w('three years to arrive. So expectations respond to inflation faster than the');
w('transmitted rate responds to the dial, the real rate moves the WRONG WAY when');
w('inflation rises, and the loop is positive unless the nominal move clears the');
w('whole distance at once. Credibility compounds it: it falls only on realised');
w('misses, so it collapses exactly when it is most needed and quadruples the');
w('Phillips slope on the way down.');
w();
w('This is the next piece of work and it comes before anything else. The acceptance');
w('test is already written — see `test/episodes.test.js`, "a bifurcation in the');
w('playable range".');
w();
w('---');
w();

// --- open disagreements, in full, first ---
w('## OPEN DISAGREEMENTS — the full text of every one');
w();
w('These are the model telling you where it is wrong. Each is a test that fails by');
w('design and prints its measured value. **This is the section to send to somebody');
w('who wants to judge whether the model is behaving correctly.**');
w();
const opens = results.filter((r) => r.todo);
opens.forEach((r, i) => {
  w(`### ${i + 1}. ${r.name.trim()}`);
  w();
  w(`*\`${r.file || '?'}\`*`);
  w();
  w(r.todo.trim());
  if (r.error && r.error !== '(multi-line, see below)') {
    w();
    w('**Measured on this run:**');
    w();
    w('```');
    w(r.error);
    w('```');
  }
  w();
});
w('---');
w();

// --- genuine failures ---
const fails = results.filter((r) => !r.ok && !r.todo);
if (fails.length) {
  w('## GENUINE FAILURES (regressions — these should not exist)');
  w();
  for (const r of fails) {
    w(`### ${r.name.trim()}`);
    w();
    w(`*\`${r.file || '?'}\`*`);
    w();
    w('```');
    w(r.error || '(no message captured — see the raw TAP at the bottom)');
    w('```');
    w();
  }
  w('---');
  w();
}

// --- every test, grouped ---
w('## EVERY TEST, BY FILE');
w();
w('`PASS` = the model matches the evidence. `OPEN` = a recorded disagreement,');
w('with its number in the section above. `FAIL` = a regression.');
w();
for (const [file, tests] of byFile(results)) {
  w(`### \`${file}\``);
  w();
  if (FILE_NOTES[file]) { w(`> ${FILE_NOTES[file]}`); w(); }
  w('| | test | result |');
  w('|---|---|---|');
  for (const t of tests) {
    const status = t.todo ? '**OPEN**' : t.ok ? 'PASS' : '**FAIL**';
    w(`| ${t.n} | ${t.name.trim().replace(/\|/g, '\\|')} | ${status} |`);
  }
  w();
}
w('---');
w();

// --- the measured behaviour ---
w('## WHAT THE MODEL ACTUALLY DOES WHEN YOU TOUCH SOMETHING');
w();
w('Generated by `node tools/cause-effect.mjs`. This is the model being run, not a');
w('description of it. Every dial moved from a settled economy; the same move from');
w('eight different starting states; what each scenario does on its own and under a');
w('rule-following central bank; what every shock does; and how long each lever takes.');
w();
w('**Conventions that matter, and both were established the hard way:**');
w();
w('- The output gap is set with a standing **external demand shock**, never with the');
w('  policy rate — setting the state with the lever under test confounds the two,');
w('  and it silently means "a recession the central bank chose not to fight".');
w('- A dial is moved through `applyDialChange`, always, because that is where the');
w('  transmission lag is scheduled. Assigning to the dial directly moves the setting');
w('  and nothing else.');
w();
w('```');
w(causeEffect.trimEnd());
w('```');
w();
w('---');
w();
w('## RAW TAP OUTPUT');
w();
w('The unedited test stream, for anything the parsing above missed.');
w();
w('```');
w(tap.trimEnd());
w('```');

writeFileSync(join(ROOT, 'TEST-RESULTS.md'), out.join('\n') + '\n');
console.error(`wrote TEST-RESULTS.md — ${results.length} tests ` +
              `(${pass} pass, ${fail} fail, ${todo} open), ${out.length} lines`);
