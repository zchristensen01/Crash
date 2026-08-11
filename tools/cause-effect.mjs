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
const only = process.argv[2];
for (const [name, fn] of Object.entries(SECTIONS)) {
  if (!only || name.toLowerCase().startsWith(only.toLowerCase())) fn();
}
console.log();
