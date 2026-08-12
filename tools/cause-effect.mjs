/**
 * CAUSE AND EFFECT — regenerates every number in docs/11-cause-and-effect.md.
 *
 *     node tools/cause-effect.mjs            everything
 *     node tools/cause-effect.mjs dials      just one section
 *
 * The doc is a claim about what this model does when you touch it. Claims like
 * that go stale silently, so they are MEASURED here rather than written down
 * from reading the code — the same rule docs/06 set for the audit, applied to
 * the documentation itself. Re-run this after any change to a rule and paste
 * the tables back in.
 *
 * Experimental conventions, both of which matter and both of which the audit
 * had to establish the hard way:
 *
 *   - the output gap is set with a STANDING EXTERNAL DEMAND SHOCK (net_exports),
 *     because it is additive in aggregate.js and read by nothing else, so it
 *     moves the state without also being the lever under test;
 *   - a dial is moved with applyDialChange, ALWAYS, because that is where the
 *     transmission lag is scheduled.
 */
import { newState, regime } from '../src/state.js';
import { tick } from '../src/engine.js';
import { Trace } from '../src/trace.js';
import { LagPipeline } from '../src/lags.js';
import { makeRng } from '../src/rng.js';
import { P } from '../src/params.js';
import { DIALS, applyDialChange } from '../src/game/dials.js';
import { SCENARIOS } from '../src/game/scenarios.js';
import { EVENTS } from '../src/game/events.js';
import { applyAutopilot } from '../src/game/autopilot.js';

const NX_DECAY = Math.pow(0.5, 1 / P.FOREIGN_DEMAND_SHOCK_HALFLIFE.value);
const QUIET = { events: false, assertEveryTick: false, endings: false };

function world({ nx = 0, taylor = false, overrides = {}, endings = false } = {}) {
  return {
    s: newState(overrides), trace: new Trace(false), pipeline: new LagPipeline(),
    rng: makeRng(1), nx,
    opts: { ...QUIET, endings, ...(taylor ? { autopilot: applyAutopilot } : {}) },
  };
}
function advance(w, months) {
  for (let i = 0; i < months; i++) {
    if (w.nx !== 0) w.s.net_exports = w.nx / NX_DECAY;
    tick(w.s, w.trace, w.pipeline, w.rng, w.opts);
  }
  return w.s;
}
const f = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '—');
const sign = (x, d = 2) => (x >= 0 ? '+' : '') + f(x, d);

/** Settle two identical worlds, shock one, report the difference over time. */
function respond({ nx = 0, taylor = false, shock, months = [1, 6, 12, 24], keys }) {
  const base = world({ nx, taylor });
  const hit = world({ nx, taylor });
  advance(base, 36); advance(hit, 36);
  const startGap = base.s.output_gap;
  shock(hit);
  const rows = [];
  let done = 0;
  for (const m of months) {
    advance(base, m - done); advance(hit, m - done); done = m;
    rows.push({ m, d: Object.fromEntries(keys.map((k) => [k, hit.s[k] - base.s[k]])) });
  }
  return { startGap, rows };
}

const KEYS = ['output', 'inflation', 'unemployment', 'investment', 'consumption',
  'govt_debt', 'asset_prices', 'credit_to_gdp_gap', 'approval', 'credibility'];
const HEAD = 'mo | output | inflat | unemp  | invest | consum | debt   | assets | crgap  | apprv  | credib';

function table({ startGap, rows }) {
  const out = [`   (starting output gap ${sign(startGap)}%)`, '   ' + HEAD,
    '   ' + '-'.repeat(HEAD.length)];
  for (const r of rows) {
    out.push('   ' + String(r.m).padStart(2) + ' | ' +
      KEYS.map((k) => sign(r.d[k], k === 'credibility' ? 3 : 2).padStart(6)).join(' | '));
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------
function dials() {
  console.log('\n' + '='.repeat(78));
  console.log('DIALS — a standard move, from a settled calm economy, no policy response');
  console.log('='.repeat(78));
  const moves = [
    ['policy_rate  −1.00pp (a cut)', (w) => applyDialChange(w.s, w.pipeline, 'policy_rate', w.s.policy_rate - 1)],
    ['policy_rate  +1.00pp (a hike)', (w) => applyDialChange(w.s, w.pipeline, 'policy_rate', w.s.policy_rate + 1)],
    ['tax_rate     −1.00pp (a cut)', (w) => applyDialChange(w.s, w.pipeline, 'tax_rate', w.s.tax_rate - 1)],
    ['tax_rate     +1.00pp (a rise)', (w) => applyDialChange(w.s, w.pipeline, 'tax_rate', w.s.tax_rate + 1)],
    ['govt_spending +1.00pp', (w) => applyDialChange(w.s, w.pipeline, 'govt_spending', w.s.govt_spending + 1)],
    ['govt_spending −1.00pp', (w) => applyDialChange(w.s, w.pipeline, 'govt_spending', w.s.govt_spending - 1)],
    ['money_printed  2.00pp', (w) => applyDialChange(w.s, w.pipeline, 'money_printed', 2)],
    ['qe            10.0pp', (w) => applyDialChange(w.s, w.pipeline, 'qe', 10)],
  ];
  for (const [name, shock] of moves) {
    console.log(`\n-- ${name}`);
    console.log(table(respond({ shock, keys: KEYS, months: [1, 3, 6, 12, 24, 48] })));
  }
}

function stateDependence() {
  console.log('\n' + '='.repeat(78));
  console.log('THE SAME MOVE, FROM DIFFERENT STARTING STATES (24 months on)');
  console.log('='.repeat(78));
  const levers = {
    'rate −1pp': (w) => applyDialChange(w.s, w.pipeline, 'policy_rate', w.s.policy_rate - 1),
    'spend +1pp': (w) => applyDialChange(w.s, w.pipeline, 'govt_spending', w.s.govt_spending + 1),
    'print 2pp': (w) => applyDialChange(w.s, w.pipeline, 'money_printed', 2),
    'tax −1pp': (w) => applyDialChange(w.s, w.pipeline, 'tax_rate', w.s.tax_rate - 1),
  };
  for (const [name, shock] of Object.entries(levers)) {
    console.log(`\n-- ${name}`);
    console.log('   start gap | Δoutput | Δinflat | Δunemp | share of the move that is OUTPUT');
    console.log('   ' + '-'.repeat(72));
    for (const nx of [-4, -3, -2, -1, 0, 1, 2, 3]) {
      const r = respond({ nx, shock, keys: KEYS, months: [24] });
      const d = r.rows[0].d;
      const share = d.output / (d.output + d.inflation);
      console.log('   ' + sign(r.startGap, 2).padStart(9) + ' | ' +
        sign(d.output).padStart(7) + ' | ' + sign(d.inflation).padStart(7) + ' | ' +
        sign(d.unemployment).padStart(6) + ' | ' + f(share, 2).padStart(8));
    }
  }
}

function noInput() {
  console.log('\n' + '='.repeat(78));
  console.log('WHAT EACH PRESET DOES ON ITS OWN — no player input, no shocks');
  console.log('='.repeat(78));
  for (const [key, sc] of Object.entries(SCENARIOS)) {
    for (const taylor of [false, true]) {
      const w = world({ overrides: sc.overrides, taylor, endings: true });
      const cells = [];
      let done = 0;
      for (const m of [1, 6, 12, 24, 48, 96]) {
        try { advance(w, m - done); } catch (e) { cells.push(`${m}m THREW`); break; }
        done = m;
        cells.push(`${String(m).padStart(2)}m ${regime(w.s).slice(0, 5)} ` +
          `gap${sign(w.s.output_gap, 1)} pi${f(w.s.inflation, 1)} u${f(w.s.unemployment, 1)} ` +
          `d${f(w.s.govt_debt, 0)} a${f(w.s.approval, 0)} cg${sign(w.s.credit_to_gdp_gap, 1)}`);
        if (w.s.ending) { cells.push(`ENDED: ${w.s.ending.key}`); break; }
      }
      console.log(`\n${key} — ${taylor ? 'Taylor-rule central bank' : 'you touch nothing'}`);
      for (const c of cells) console.log('   ' + c);
    }
  }
}

function automatic() {
  console.log('\n' + '='.repeat(78));
  console.log('WHAT HAPPENS WITH NO DECISION FROM YOU — the automatic machinery');
  console.log('='.repeat(78));
  const r = respond({
    shock: (w) => applyDialChange(w.s, w.pipeline, 'govt_spending', w.s.govt_spending - 5),
    keys: ['output', 'market_income', 'tax_revenue', 'transfers', 'disposable_income',
      'deficit', 'structural_deficit', 'unemployment'],
    months: [1, 3, 6, 12, 24],
  });
  console.log('\n-- a −5pp spending cut, and what the stabilisers do about it');
  console.log('   mo | Δoutput | Δmktinc | Δtaxrev | Δtransf | Δdispos | Δdeficit | Δstruct | absorbed');
  console.log('   ' + '-'.repeat(88));
  for (const row of r.rows) {
    const d = row.d;
    console.log('   ' + String(row.m).padStart(2) + ' | ' +
      [d.output, d.market_income, d.tax_revenue, d.transfers, d.disposable_income,
        d.deficit, d.structural_deficit].map((v) => sign(v).padStart(7)).join(' | ') +
      ' | ' + f(1 - d.disposable_income / d.market_income, 2).padStart(8));
  }
}

function shocks() {
  console.log('\n' + '='.repeat(78));
  console.log('SHOCKS — what each one does, measured, from a settled calm economy');
  console.log('='.repeat(78));
  for (const ev of EVENTS) {
    const scenario = ev.key === 'financial_crisis' || ev.key === 'bank_wobble' ? 'bubble' : 'calm';
    const shock = (w) => ev.apply(w.s);
    const base = world({ overrides: SCENARIOS[scenario].overrides });
    const hit = world({ overrides: SCENARIOS[scenario].overrides });
    advance(base, 36); advance(hit, 36);
    shock(hit);
    const cells = [];
    let done = 0;
    for (const m of [1, 6, 12, 24, 48]) {
      advance(base, m - done); advance(hit, m - done); done = m;
      cells.push(`${String(m).padStart(2)}m out${sign(hit.s.output - base.s.output, 1)} ` +
        `pi${sign(hit.s.inflation - base.s.inflation, 1)} u${sign(hit.s.unemployment - base.s.unemployment, 1)} ` +
        `appr${sign(hit.s.approval - base.s.approval, 0)}`);
    }
    console.log(`\n${ev.name}  (${scenario} baseline, ${ev.chance ? ev.chance + '%/yr' : 'crisis_prob'})`);
    console.log('   ' + cells.join('   '));
  }
}

function lags() {
  console.log('\n' + '='.repeat(78));
  console.log('HOW LONG EACH LEVER TAKES — share of the 48-month response delivered by month N');
  console.log('='.repeat(78));
  const levers = {
    'policy_rate −1pp': (w) => applyDialChange(w.s, w.pipeline, 'policy_rate', w.s.policy_rate - 1),
    'tax_rate −1pp': (w) => applyDialChange(w.s, w.pipeline, 'tax_rate', w.s.tax_rate - 1),
    'govt_spending +1pp': (w) => applyDialChange(w.s, w.pipeline, 'govt_spending', w.s.govt_spending + 1),
    'money_printed 2pp': (w) => applyDialChange(w.s, w.pipeline, 'money_printed', 2),
    'qe 10pp': (w) => applyDialChange(w.s, w.pipeline, 'qe', 10),
  };
  const ms = [1, 3, 6, 9, 12, 18, 24, 36, 48];
  console.log('   lever                | ' + ms.map((m) => String(m).padStart(4)).join(' '));
  console.log('   ' + '-'.repeat(21 + ms.length * 5));
  for (const [name, shock] of Object.entries(levers)) {
    const r = respond({ shock, keys: ['output'], months: ms });
    const total = r.rows.at(-1).d.output;
    console.log('   ' + name.padEnd(20) + ' | ' +
      r.rows.map((x) => f(x.d.output / total, 2).padStart(4)).join(' '));
  }
  console.log('\n   (1.00 = fully delivered. Above 1.00 means it overshoots and comes back.)');

  // TWO DIFFERENT LAGS, and conflating them is how the audit brief ended up
  // measuring the capacity ceiling and calling it a lower bound. The KERNEL is
  // how fast the dial move reaches the economy at all. The RESPONSE above
  // keeps accumulating long after the kernel has fully landed, because a
  // permanent change in the stance is permanent.
  console.log('\n   How much of a rate move the economy has FELT (the kernel alone):');
  const w = world({});
  advance(w, 12);
  const from = w.s.policy_rate_demand, fast0 = w.s.policy_rate_markets;
  applyDialChange(w.s, w.pipeline, 'policy_rate', w.s.policy_rate - 1);
  const line = ['   mo   |'], demand = ['   real |'], markets = ['   mkts |'];
  let done = 0;
  for (const m of ms) {
    advance(w, m - done); done = m;
    line.push(String(m).padStart(5));
    demand.push(f(-(w.s.policy_rate_demand - from), 2).padStart(5));
    markets.push(f(-(w.s.policy_rate_markets - fast0), 2).padStart(5));
  }
  console.log(line.join('') + '     (pp of a 1.00pp cut)');
  console.log(demand.join(''));
  console.log(markets.join(''));
}

const SECTIONS = { dials, stateDependence, noInput, automatic, shocks, lags };

/**
 * --check: has the model moved since docs/11 was last regenerated?
 *
 * docs/11 is the one document whose numbers are generated, and its header has
 * always said "re-run this and paste the output back in". That is a process,
 * and the process failed: it went two full passes stale, so every number in it
 * predated the transmission split, the derived rate ceiling, the closed
 * bifurcation and the asset-price units fix. Nothing detected that, because
 * nothing could — the doc looked exactly as authoritative when wrong.
 *
 * Fully generating the file is the other repair, and it is not obviously
 * better: most of docs/11's value is the prose explaining each chain in the
 * order it fires, that prose quotes the numbers inline, and moving it into a
 * template here would trade one staleness risk for a harder-to-read one.
 *
 * So instead the document carries a FINGERPRINT of every number this tool
 * measures. It does not claim the prose is correct — it claims the document
 * was written against a model that produced exactly these numbers. Change any
 * rule or parameter that moves any of them and the fingerprint no longer
 * matches, `npm test` fails, and the failure names the tool to re-run. That is
 * a weaker guarantee than generation and a much stronger one than a comment
 * asking the next person to remember.
 */
function fingerprint() {
  const lines = [];
  const real = console.log;
  console.log = (...a) => lines.push(a.join(' '));
  try { for (const fn of Object.values(SECTIONS)) fn(); } finally { console.log = real; }
  // Hash the measured numbers only, so re-wording a heading here does not
  // invalidate a document whose numbers are still right.
  const numbers = lines.join('\n').match(/-?\d+\.\d+|-?\d+/g) || [];
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (const n of numbers) {
    for (let i = 0; i < n.length; i++) {
      h1 = Math.imul(h1 ^ n.charCodeAt(i), 0x01000193) >>> 0;
      h2 = Math.imul(h2 + n.charCodeAt(i) + 1, 0x85ebca6b) >>> 0;
    }
  }
  return { hash: (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')), count: numbers.length };
}

/**
 * THE TABLES ARE CHECKED, AND THE PROSE IS NOT [4th audit 5.17, open_items E9].
 *
 * THE HOLE THE FINGERPRINT LEFT. It hashes the MODEL's measurements, not the
 * DOCUMENT's contents, so it answers "has the model moved since someone last
 * stamped?" and not "does this document contain the model's numbers?" Falsify
 * a table cell, run --stamp, and --check is perfectly happy. That is exactly
 * how §1 and §3-§7 stayed stale through the Phase 4 hard gate: 4.3 regenerated
 * §2, stamped, and the check was green for the rest of the audit while §1's
 * kernel table still described the pre-2.1 model.
 *
 * The comment above weighs two options — fingerprint versus generating the
 * whole file — and picks the fingerprint because most of docs/11's value is
 * the prose. That reasoning is right and is kept. THERE IS A THIRD OPTION IT
 * DOES NOT CONSIDER: check the TABLES and leave the PROSE. The tables are
 * verbatim tool output; only the prose is hand-written, and nothing about
 * keeping the prose requires the tables to go unverified.
 *
 * So: --write splices the tables in, --check verifies them byte-for-byte, and
 * the fingerprint stays for everything the tables do not cover (§5's preset
 * paths and §6's shocks, which are hand-reformatted rather than pasted).
 * Before this the splicing was done by a throwaway script in a scratchpad,
 * which is the same class of hazard as a process that depends on someone
 * remembering.
 */
const BLOCKS = [
  // heading in docs/11            -> the tool's label,                writable?
  ['### `policy_rate` −1.00pp — a cut',  'policy_rate −1.00pp (a cut)',  true],
  ['### `policy_rate` +1.00pp — a hike', 'policy_rate +1.00pp (a hike)', true],
  ['### `tax_rate` −1.00pp — a cut',     'tax_rate −1.00pp (a cut)',     true],
  ['### `govt_spending` +1.00pp',        'govt_spending +1.00pp',        true],
  ['### `money_printed` 2.00pp',         'money_printed 2.00pp',         true],
  ['### `qe` 10.0pp',                    'qe 10.0pp',                    true],
  // §4 has no sub-heading of its own, so the section heading is the anchor —
  // and its header row is hand-widened for readability (`Δmkt income` against
  // the tool's `Δmktinc`), so it is CHECKED but never overwritten. Checking
  // compares the NUMBERS, which is what goes stale; the formatting is the
  // document's own business.
  ['## 4. What happens with no decision from you',
                                        'a −5pp spending cut, and what the stabilisers do about it', false],
];

/** The numeric content of a table, which is the only part that can go stale. */
const numbersOf = (block) => (block.match(/-?\d+(?:\.\d+)?/g) || []).join(' ');

/** Every "-- <label>" table the tool prints, dedented, keyed by label. */
function measuredTables() {
  const captured = [];
  const real = console.log;
  console.log = (...a) => captured.push(a.join(' '));
  try { for (const fn of Object.values(SECTIONS)) fn(); } finally { console.log = real; }
  // RE-SPLIT. Several sections print a whole block in ONE console.log call, so
  // an element of `captured` can hold many lines and a per-element `^--` match
  // finds nothing. fingerprint() below joins before matching and so never had
  // to care; this did, and silently reported every table as unmeasured.
  const lines = captured.join('\n').split('\n');
  const out = {};
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^-- (.+?)\s*$/);
    if (!m) continue;
    const rows = [];
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (/^\s*\(starting output gap/.test(l)) continue;
      if (l.includes('|') || /^\s*-{10,}\s*$/.test(l)) { rows.push(l.replace(/^ {3}/, '')); continue; }
      if (rows.length) break;
      if (l.trim() === '') continue;
      break;
    }
    if (rows.length) out[m[1].replace(/\s+/g, ' ')] = rows.join('\n');
  }
  return out;
}

/* ===================================================================
 * THE SECOND HOLE, AND IT IS THE SAME HOLE [4th audit 5.20, open_items E12].
 *
 * 5.17 closed E9 for the tables docs/11 pastes inside ``` fences: six dial
 * tables in §2 and the stabiliser table in §4. It then reported "7 tables
 * verified", which reads as "docs/11's tables are verified" and means "seven
 * of docs/11's twelve are". The other five are markdown PIPE tables — §1's
 * kernel and response tables, §3's three state-dependence tables, §5's six
 * preset paths and §6's shock table — and nothing checked them at all.
 *
 * ASK OF EVERY GUARD WHAT WOULD HAVE TO BE TRUE FOR IT TO PASS WHILE THE THING
 * IT GUARDS IS BROKEN. For the table check the answer was: the stale number is
 * in a table that is not fenced. Verified end to end — falsify a cell in §3,
 * run --stamp, and --check is green, which is Correction 26 unchanged.
 *
 * It was not hypothetical either. When this was written §1's response table,
 * §5's presets and §6's shocks were between them **56 cells stale**, and §5's
 * `stagflation` row said the Taylor arm ends GOLDILOCKS at 2.9% four lines
 * above prose saying it ends OVERHEATING at 3.2%. 5.8 updated the prose and
 * left the table, because only one of the two had a reader.
 *
 * WHY THIS IS NOT JUST "FENCE THE OTHER FIVE". The five are hand-shaped: §5
 * picks 4-6 of the tool's rows and drops the credit gap where it is not the
 * point, §6 picks the fields worth naming per shock, §3's `money_printed`
 * drops a column. That shaping is the document's job — §4's precedent already
 * says formatting is the document's business and NUMBERS are what go stale.
 * So the comparison is per CELL: parse the document's own format, and for
 * every cell it chooses to show, require the model's value for that cell.
 * The document decides what to say; the model decides what the numbers are.
 *
 * Both halves parse the tool's PRINTED OUTPUT rather than a parallel
 * machine-readable emitter, for the reason measuredTables() does: the doc's
 * contract is "re-run this and paste the output back in", and a second source
 * of truth is a second thing that can drift.
 * =================================================================== */

/** Unicode minus, markdown bold and backticks are decoration, not content. */
const plain = (t) => String(t).replace(/[−–—]/g, '-').replace(/[*`]/g, '');
const label = (t) => plain(t).replace(/\s+/g, ' ').trim();
/** A cell's numeric value, or NaN if it is prose (`identical`, `—`). */
const num = (t) => parseFloat(plain(t).replace(/\s+/g, ''));

/** Split a `a | b | c` row into trimmed fields, ignoring the outer pipes. */
const pipes = (l) => l.replace(/^\s*\|?/, '').replace(/\|?\s*$/, '').split('|').map((c) => c.trim());

/**
 * Every measured cell the tool prints, as `block -> key -> value`.
 * Keys are stable and human-readable, because they are what a failure names.
 */
function measuredCells() {
  const captured = [];
  const real = console.log;
  console.log = (...a) => captured.push(a.join(' '));
  try { for (const fn of Object.values(SECTIONS)) fn(); } finally { console.log = real; }
  const lines = captured.join('\n').split('\n');
  const out = {};
  const put = (b, k, v) => { (out[b] ??= {})[k] = v; };

  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];

    // §1 response — `   lever                |    1    3 ...` then one row per lever.
    let m = L.match(/^\s*lever\s*\|(.*)$/);
    if (m) {
      const months = m[1].trim().split(/\s+/);
      for (let j = i + 2; j < lines.length; j++) {
        const r = lines[j].match(/^\s{3}(\S.*?)\s*\|\s*(\S.*)$/);
        if (!r) break;
        const vals = r[2].trim().split(/\s+/);
        months.forEach((mo, k) => put('lags.response', `${label(r[1])} @ ${mo}m`, vals[k]));
      }
    }

    // §1 kernel — `   mo   |    1    3 ...  (pp of a 1.00pp cut)` then real/mkts.
    m = L.match(/^\s*mo\s+\|(.*)$/);
    if (m) {
      const months = (m[1].split('(')[0].match(/\d+/g) || []);
      for (const row of ['real', 'mkts']) {
        const r = lines.find((l) => l.startsWith(`   ${row} |`));
        if (!r) continue;
        const vals = r.split('|')[1].trim().split(/\s+/);
        months.forEach((mo, k) => put('lags.kernel', `${row} @ ${mo}m`, vals[k]));
      }
    }

    // §3 — `-- rate −1pp`, a header row, a rule, then one row per starting gap.
    m = L.match(/^-- (rate|spend|print|tax) (.+?)\s*$/);
    if (m) {
      const block = `state.${label(m[1] + ' ' + m[2])}`;
      const cols = ['gap', 'output', 'inflation', 'unemp', 'share'];
      for (let j = i + 3; j < lines.length; j++) {
        const cells = lines[j].includes('|') ? pipes(lines[j]) : null;
        if (!cells || cells.length !== cols.length) break;
        const gap = num(cells[0]).toFixed(2);
        cols.slice(1).forEach((c, k) => put(block, `gap ${gap} / ${c}`, cells[k + 1]));
      }
    }

    // §5 — `recession — Taylor-rule central bank`, then `  24m RECES gap-6.5 ...`.
    m = L.match(/^(\w+) — (you touch nothing|Taylor-rule central bank)\s*$/);
    if (m) {
      const block = `preset.${m[1]}.${m[2].startsWith('you') ? 'no input' : 'Taylor'}`;
      out[block] ??= {};
      for (let j = i + 1; j < lines.length; j++) {
        const r = lines[j].match(
          /^\s+(\d+)m (\w+) gap([-+][\d.]+) pi([-\d.]+) u([-\d.]+) d([-\d.]+) a([-\d.]+) cg([-+][\d.]+)/);
        if (!r) { if (/^\s+ENDED:/.test(lines[j])) continue; break; }
        const mo = r[1];
        put(block, `${mo}m / regime`, r[2]);
        ['gap', 'inflation', 'unemployment', 'debt', 'approval', 'credit gap']
          .forEach((f, k) => put(block, `${mo}m / ${f}`, r[k + 3]));
      }
    }

    // §6 — `Oil price spike  (calm baseline, …)`, then every month on one line.
    m = L.match(/^([A-Z][^(]*?)\s+\((calm|bubble) baseline/);
    if (m) {
      const block = `shock.${label(m[1])}`;
      out[block] ??= {};
      const re = /(\d+)m out([-+][\d.]+) pi([-+][\d.]+) u([-+][\d.]+) appr([-+]\d+)/g;
      for (const r of (lines[i + 1] || '').matchAll(re)) {
        ['out', 'pi', 'u', 'appr'].forEach((f, k) => put(block, `${r[1]}m / ${f}`, r[k + 2]));
      }
    }
  }
  return out;
}

/**
 * WHAT WOULD HAVE TO BE TRUE FOR THE CELL CHECK TO PASS WHILE docs/11 IS
 * STALE? The parser would have to stop matching. Rename a §5 heading, change
 * `| 24m |` to `| month 24 |`, and every cell under it goes unparsed — and an
 * unparsed cell disagrees with nothing, so the run reports clean.
 *
 * So coverage is declared, not inferred, exactly as BLOCKS is: these are the
 * pipe-table blocks docs/11 is expected to state, and the count of cells found
 * under them. Both are asserted. A deliberate edit that adds or drops a row
 * fails with the new number to paste in; an accidental one that silences the
 * parser fails by name.
 */
const PIPE_BLOCKS = [
  'lags.kernel', 'lags.response',
  'state.rate -1pp', 'state.spend +1pp', 'state.print 2pp',
  'preset.calm.no input', 'preset.calm.Taylor',
  'preset.overheating.no input', 'preset.overheating.Taylor',
  'preset.recession.no input', 'preset.recession.Taylor',
  'preset.stagflation.no input', 'preset.stagflation.Taylor',
  'preset.debt_trap.no input', 'preset.debt_trap.Taylor',
  'preset.bubble.no input',
  'shock.Oil price spike', 'shock.Productivity boom', 'shock.Bank wobble',
  'shock.FINANCIAL CRISIS', 'shock.Export slump',
];
/** Cells found under those blocks. Update deliberately when the doc gains a row. */
const PIPE_CELLS = 453;

/** Which tool block each of §3's headings and §5's presets belongs to. */
const LEVER_SHORT = { policy_rate: 'rate', govt_spending: 'spend', money_printed: 'print', tax_rate: 'tax' };
/** §5's cell format, declared in the document itself, in order. */
const PRESET_FIELDS = ['gap', 'inflation', 'unemployment', 'debt', 'approval', 'credit gap'];
/** §6 names its fields inline; `π` is the document's spelling of `pi`. */
const SHOCK_FIELDS = { out: 'out', 'π': 'pi', pi: 'pi', u: 'u', appr: 'appr' };

/**
 * The number tokens inside [from, to) of a line, in order.
 * Locating by TOKEN rather than by the cell's own text is what lets a cell
 * carry decoration: `**246**`, `cg +2.5` and `−7.3` all yield one token, and
 * --write can splice the number without touching the bold or the prefix.
 */
function numTokens(line, from, to) {
  const re = /[+\-\u2212]?\d+(?:\.\d+)?/g;
  re.lastIndex = from;
  const out = [];
  let m;
  while ((m = re.exec(line)) !== null && m.index < to) {
    out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

/**
 * Every cell docs/11 states in a pipe table, with where its number sits.
 * @returns {{block:string,key:string,text:string,line:number,
 *            start:number,end:number,mirror?:string}[]}
 */
function docCells(docLines) {
  const found = [];
  let section = 0, preset = null, lever = null;
  const at = (block, key, line, tok) => {
    if (tok) found.push({ block, key, text: tok.text, line, start: tok.start, end: tok.end });
  };
  /** Where a row's k-th cell begins and ends in the raw line. */
  const spanOf = (line, cell, from) => {
    const start = line.indexOf(cell, from);
    return start < 0 ? null : { start, end: start + cell.length };
  };

  for (let i = 0; i < docLines.length; i++) {
    const L = docLines[i];
    let m = L.match(/^## (\d+)\./);
    if (m) { section = +m[1]; preset = lever = null; continue; }
    m = L.match(/^### `(\w+)`\s*(\S*)/);
    if (m) {
      preset = section === 5 ? m[1] : null;
      // §3's heading carries the move as well as the dial: "### `qe` 10pp".
      lever = section === 3 && LEVER_SHORT[m[1]] ? `${LEVER_SHORT[m[1]]} ${plain(m[2])}` : null;
    }

    // §1 — two transposed tables: each row is a series, each column a month.
    if (section === 1 && /^\|\s*(lever|month)\s*\|/.test(L)) {
      const kernel = /month/.test(L);
      const block = kernel ? 'lags.kernel' : 'lags.response';
      const months = pipes(L).slice(1);
      for (let j = i + 2; j < docLines.length && docLines[j].startsWith('|'); j++) {
        const cells = pipes(docLines[j]);
        if (cells.length !== months.length + 1) continue;   // the |---|---| rule
        const name = label(cells[0]);
        const row = kernel ? (name.startsWith('real') ? 'real' : 'mkts') : name;
        let cursor = 0;
        months.forEach((mo, k) => {
          const sp = spanOf(docLines[j], cells[k + 1], cursor);
          if (!sp) return;
          cursor = sp.end;
          at(block, `${row} @ ${mo}m`, j, numTokens(docLines[j], sp.start, sp.end)[0]);
        });
      }
    }

    // §3 — rows keyed by starting gap, columns named in the header.
    if (section === 3 && lever && /^\|\s*start gap\s*\|/.test(L)) {
      const cols = pipes(L).slice(1).map((c) => label(c).replace(/^\u0394/, '').replace('output share', 'share'));
      for (let j = i + 2; j < docLines.length && docLines[j].startsWith('|'); j++) {
        const cells = pipes(docLines[j]);
        if (cells.length !== cols.length + 1) continue;
        const gap = num(cells[0]).toFixed(2);
        let cursor = spanOf(docLines[j], cells[0], 0)?.end ?? 0;
        cols.forEach((c, k) => {
          const sp = spanOf(docLines[j], cells[k + 1], cursor);
          if (!sp) return;
          cursor = sp.end;
          at(`state.${lever}`, `gap ${gap} / ${c}`, j, numTokens(docLines[j], sp.start, sp.end)[0]);
        });
      }
    }

    // §5 — `| 24m | <no input> | <Taylor> |`, the cell format declared in the
    //      section's own preamble: regime gap/inflation/unemp/debt/approval/cg.
    if (section === 5 && preset && /^\|\s*\|/.test(L)) {
      const arms = pipes(L).slice(1).map((a) => label(a));
      for (let j = i + 2; j < docLines.length && docLines[j].startsWith('|'); j++) {
        const cells = pipes(docLines[j]);
        const mo = (cells[0].match(/^(\d+)m$/) || [])[1];
        if (!mo) continue;
        let cursor = spanOf(docLines[j], cells[0], 0)?.end ?? 0;
        arms.forEach((arm, a) => {
          const cell = cells[a + 1];
          const sp = cell === undefined ? null : spanOf(docLines[j], cell, cursor);
          if (sp) cursor = sp.end;
          if (!cell || !sp || /^[\u2014\u2013-]$/.test(cell.trim())) return;
          const block = `preset.${preset}.${arm}`;
          // `identical` / `same` is a claim about the MODEL — that the two arms
          // agree at this month — so it is checked, not skipped.
          if (/^\W*(identical|same)\W*$/i.test(cell)) {
            found.push({ block, key: `${mo}m`, text: cell, line: j, start: -1, end: -1,
              mirror: `preset.${preset}.${arms[1 - a]}` });
            return;
          }
          // Everything before the `→ ENDING` tail; fields are slash-separated
          // and positional, and the document may stop early.
          const head = cell.split('\u2192')[0];
          const headEnd = sp.start + head.length;
          const regime = head.match(/\b[A-Z]{5}\b/);
          if (regime) {
            const rs = docLines[j].indexOf(regime[0], sp.start);
            found.push({ block, key: `${mo}m / regime`, text: regime[0], line: j,
              start: rs, end: rs + regime[0].length });
          }
          numTokens(docLines[j], sp.start, headEnd)
            .forEach((tok, k) => at(block, `${mo}m / ${PRESET_FIELDS[k]}`, j, tok));
        });
      }
    }

    // §6 — one table, rows are shocks, and each cell names its own fields.
    if (section === 6 && /^\|\s*Shock\s*\|/.test(L)) {
      const months = pipes(L).slice(1).map((c) => c.replace(/\D/g, ''));
      for (let j = i + 2; j < docLines.length && docLines[j].startsWith('|'); j++) {
        const cells = pipes(docLines[j]);
        if (cells.length !== months.length + 1) continue;
        const block = `shock.${label(cells[0]).replace(/\s*\([^)]*\)\s*$/, '')}`;
        let cursor = spanOf(docLines[j], cells[0], 0)?.end ?? 0;
        months.forEach((mo, k) => {
          const sp = spanOf(docLines[j], cells[k + 1], cursor);
          if (!sp) return;
          cursor = sp.end;
          let inner = sp.start;
          for (const part of cells[k + 1].split(',')) {
            const f = part.trim().match(/^(out|\u03c0|pi|u|appr)\s/);
            const ps = spanOf(docLines[j], part.trim(), inner);
            if (!ps) continue;
            inner = ps.end;
            if (f) at(block, `${mo}m / ${SHOCK_FIELDS[f[1]]}`, j, numTokens(docLines[j], ps.start, ps.end)[0]);
          }
        });
      }
    }
  }
  return found;
}

/**
 * Find the fenced block that follows a heading, and return its span.
 * Returns null if the heading is absent — which is itself a failure, because
 * it means the document no longer has a table this tool measures.
 */
function fencedAfter(docLines, heading) {
  const i = docLines.findIndex((l) => l.trim() === heading || l.trim().startsWith(heading));
  if (i < 0) return null;
  let a = i;
  while (a < docLines.length && docLines[a] !== '```') a++;
  if (a >= docLines.length) return null;
  let b = a + 1;
  while (b < docLines.length && docLines[b] !== '```') b++;
  if (b >= docLines.length) return null;
  return { start: a + 1, end: b, body: docLines.slice(a + 1, b).join('\n') };
}

const MARKER = /<!-- cause-effect-fingerprint: ([0-9a-f]+) \((\d+) numbers\) -->/;
const DOC = new URL('../docs/11-cause-and-effect.md', import.meta.url);

/**
 * Compare, or rewrite, every table docs/11 pastes verbatim.
 * @returns {string[]} human-readable descriptions of what disagreed
 */
function tables(mode) {
  const { readFileSync, writeFileSync } = fsSync;
  const measured = measuredTables();
  const docLines = readFileSync(DOC, 'utf8').split('\n');
  const problems = [];
  let rewritten = 0;
  // Bottom-up, so splicing one block cannot move the line numbers of the next.
  for (const [heading, label, writable] of [...BLOCKS].reverse()) {
    const want = measured[label];
    if (want === undefined) { problems.push(`the tool no longer measures '${label}'`); continue; }
    const found = fencedAfter(docLines, heading);
    if (!found) { problems.push(`docs/11 has no fenced table under '${heading}'`); continue; }
    if (numbersOf(found.body) === numbersOf(want)) continue;
    if (mode === 'write' && writable) {
      docLines.splice(found.start, found.end - found.start, ...want.split('\n'));
      rewritten += 1;
    } else {
      const w = want.split('\n').filter((l) => /\d/.test(l));
      const g = found.body.split('\n').filter((l) => /\d/.test(l));
      const i = w.findIndex((l, k) => numbersOf(g[k] ?? '') !== numbersOf(l));
      problems.push(
        `'${heading}' disagrees with the model` +
        (writable ? '' : ' (hand-maintained: fix it by hand)') +
        ` — first differing row:\n` +
        `      document: ${(g[i] ?? '(missing)').trim()}\n` +
        `      model:    ${(w[i] ?? '(missing)').trim()}`);
    }
  }
  if (mode === 'write') {
    writeFileSync(DOC, docLines.join('\n'));
    console.log(`cause-effect: rewrote ${rewritten} of ` +
                `${BLOCKS.filter((b3) => b3[2]).length} writable tables in docs/11`);
  }
  return problems;
}

/**
 * Compare, or repair, every cell docs/11 states in a pipe table.
 *
 * REPAIR IS PER-TOKEN, NOT PER-TABLE. The fenced tables above are rewritten
 * wholesale because they are verbatim tool output; these are not, so a write
 * splices the model's value over the stale NUMBER and leaves the bold, the
 * `cg` prefixes, the `→ HYPERINFLATION` tails and the row selection exactly as
 * the author left them. Anything else would rewrite the document's editorial
 * choices to fix an arithmetic error.
 *
 * @returns {string[]} human-readable descriptions of what disagreed
 */
function cells(mode) {
  const { readFileSync, writeFileSync } = fsSync;
  const measured = measuredCells();
  const docLines = readFileSync(DOC, 'utf8').split('\n');
  const problems = [];
  const edits = [];
  const seen = docCells(docLines);
  // COVERAGE IS PART OF THE RESULT. A cell check that silently parses nothing
  // reports "clean", which is the failure mode this whole task is about, so the
  // count of cells actually compared is printed on success and asserted by
  // test/docs.test.js. Silence has to mean "checked and agreed".
  cells.checked = seen.length;
  const got = new Set(seen.map((c) => c.block));
  cells.blocks = got.size;
  for (const b of PIPE_BLOCKS) {
    if (!got.has(b)) {
      problems.push(`§ ${b} — docs/11 states this table and the check found NO cells in it. ` +
        `The document's format has moved away from what docCells() parses, which means ` +
        `every cell under it is now unchecked.`);
    }
  }
  if (seen.length !== PIPE_CELLS && got.size === PIPE_BLOCKS.length) {
    problems.push(`the pipe tables hold ${seen.length} cells and PIPE_CELLS says ${PIPE_CELLS}. ` +
      `If you added or removed a row on purpose, set PIPE_CELLS to ${seen.length}; ` +
      `if you did not, a row has stopped parsing and is no longer checked.`);
  }

  for (const c of seen) {
    const want = measured[c.block];
    if (!want) { problems.push(`§ '${c.block}' — the tool no longer measures this block`); continue; }
    // `identical` / `same` is a claim about the MODEL: the two arms agree.
    if (c.mirror) {
      const other = measured[c.mirror] || {};
      // c.key is the month alone ("96m"); the cells under it are "96m / debt".
      const differs = Object.keys(want).filter((k) => k.startsWith(`${c.key} / `) && want[k] !== other[k]);
      if (differs.length) {
        problems.push(`§ ${c.block} — ${c.key} says '${c.text.trim()}' (docs/11 line ${c.line + 1}) ` +
          `but the arms no longer agree: ` +
          differs.map((k) => `${k.split(' / ')[1]} ${other[k]} vs ${want[k]}`).join(', '));
      }
      continue;
    }
    if (!(c.key in want)) { problems.push(`§ ${c.block} — the tool no longer measures '${c.key}'`); continue; }
    const model = want[c.key];
    const a = parseFloat(plain(model)), b = parseFloat(plain(c.text));
    // Numbers compare NUMERICALLY, so `-0.00` and `+0.00` agree: at the
    // document's own precision those are the same measurement, and requiring
    // the sign glyph to match would make the guard noisy about nothing.
    const same = Number.isFinite(a) && Number.isFinite(b) ? a === b : label(model) === label(c.text);
    if (same) continue;
    problems.push(`§ ${c.block} — ${c.key} (docs/11 line ${c.line + 1}): ` +
      `document ${c.text.trim()}, model ${model}`);
    edits.push({ ...c, model });
  }

  if (mode === 'write' && edits.length) {
    // Right to left within a line, so one splice cannot move the next one's span.
    edits.sort((a2, b2) => (b2.line - a2.line) || (b2.start - a2.start));
    for (const e of edits) {
      // Keep the document's own minus glyph; the tool prints ASCII.
      const out = /−/.test(e.text) ? String(e.model).replace(/-/g, '−') : String(e.model);
      const L = docLines[e.line];
      docLines[e.line] = L.slice(0, e.start) + out + L.slice(e.end);
    }
    writeFileSync(DOC, docLines.join('\n'));
    console.log(`cause-effect: repaired ${edits.length} stale cells in docs/11's pipe tables`);
    return [];
  }
  return problems;
}

const fsSync = await import('node:fs');

if (process.argv.includes('--cells')) {
  // What SHOULD a cell say? The failure names the key; this prints the value.
  const measured = measuredCells();
  for (const [block, kv] of Object.entries(measured)) {
    console.log(`\n-- ${block}`);
    for (const [k, v] of Object.entries(kv)) console.log(`   ${k.padEnd(34)} ${v}`);
  }
  process.exit(0);
}

if (process.argv.includes('--write')) {
  tables('write');
  cells('write');
  // Re-stamp, since rewriting the tables is exactly when the fingerprint moves.
  process.argv.push('--stamp');
}

if (process.argv.includes('--check') || process.argv.includes('--stamp')) {
  const { hash, count } = fingerprint();
  const stamp = `<!-- cause-effect-fingerprint: ${hash} (${count} numbers) -->`;
  const { readFileSync, writeFileSync } = await import('node:fs');
  const doc = readFileSync(DOC, 'utf8');
  if (process.argv.includes('--stamp')) {
    writeFileSync(DOC, MARKER.test(doc) ? doc.replace(MARKER, stamp) : `${stamp}\n${doc}`);
    console.log(`cause-effect: stamped docs/11 with ${hash} (${count} numbers)`);
  } else {
    const m = doc.match(MARKER);
    if (!m) {
      console.error('\ncause-effect: docs/11 carries no fingerprint. Run `node tools/cause-effect.mjs --stamp`.\n');
      process.exit(1);
    }
    if (m[1] !== hash) {
      console.error(
        `\ncause-effect: docs/11 IS STALE.\n\n` +
        `  Its numbers were generated against a model that no longer exists:\n` +
        `    document ${m[1]}\n    model    ${hash}\n\n` +
        `  docs/11 is the operator's manual — what actually happens when you touch\n` +
        `  each input. It went two passes stale before this check existed. Re-run\n` +
        `  \`node tools/cause-effect.mjs\`, update the tables AND the numbers quoted\n` +
        `  in the prose, then \`node tools/cause-effect.mjs --stamp\`.\n`);
      process.exit(1);
    }
    // THE FINGERPRINT ALONE WAS NOT ENOUGH. It says the model has not moved
    // since somebody stamped; it says nothing about whether the document
    // contains the model's numbers, so --stamp could bless a falsified table.
    // The tables are checked directly.
    const bad = [...tables('check'), ...cells('check')];
    if (bad.length) {
      console.error(
        `\ncause-effect: docs/11's TABLES disagree with the model.\n\n` +
        bad.map((b2) => `    ${b2}`).join('\n') +
        `\n\n  The fingerprint matched, which is the point: it hashes what the\n` +
        `  MODEL measures, not what the DOCUMENT says, so --stamp can bless a\n` +
        `  stale table. That is how §1 and §3-§7 survived the Phase 4 gate.\n` +
        `  Run \`node tools/cause-effect.mjs --write\` to rewrite the tables and\n` +
        `  re-stamp, then check the numbers quoted in the PROSE by hand — those\n` +
        `  are still not covered by anything.\n`);
      process.exit(1);
    }
    console.log(`cause-effect: docs/11 is current (${hash}, ${count} numbers, ` +
                `${BLOCKS.length} fenced tables and ${cells.checked} cells ` +
                `across ${cells.blocks} pipe tables verified)`);
  }
} else {
  const only = process.argv[2];
  for (const [name, fn] of Object.entries(SECTIONS)) {
    if (!only || name.toLowerCase().startsWith(only.toLowerCase())) fn();
  }
  console.log();
}
