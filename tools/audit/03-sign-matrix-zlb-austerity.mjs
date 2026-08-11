import { ctx, step, applyDialChange, f, OPTS, P } from './h.mjs';

const KEYS = ['output', 'unemployment', 'inflation', 'govt_debt', 'asset_prices', 'credit_to_gdp_gap'];
const sgn = (x, tol) => (Math.abs(x) < tol ? '0' : x > 0 ? '+' : '-');

function shock(dial, delta, months, settle = 36, over = {}) {
  const a = ctx(over); const b = ctx(over);
  step(a, settle); step(b, settle);
  applyDialChange(b.s, b.pipeline, dial, b.s[dial] + delta);
  step(a, months); step(b, months);
  const out = {};
  for (const k of KEYS) out[k] = b.s[k] - a.s[k];
  out._gapStart = a.s.output_gap;
  return out;
}

console.log('=== F4: sign matrix at the calm baseline, 24 months after the move ===');
const doc = {
  'rate -0.25':  { output: '+', unemployment: '-', inflation: '+', govt_debt: '-', asset_prices: '+', credit_to_gdp_gap: '+' },
  'rate +0.25':  { output: '-', unemployment: '+', inflation: '-', govt_debt: '+', asset_prices: '-', credit_to_gdp_gap: '-' },
  'tax -1':      { output: '~', unemployment: '-', inflation: '~', govt_debt: '+', asset_prices: '+', credit_to_gdp_gap: '+' },
  'tax +1':      { output: '-', unemployment: '+', inflation: '-', govt_debt: '-', asset_prices: '-', credit_to_gdp_gap: '-' },
  'spend +1':    { output: '+', unemployment: '-', inflation: '~', govt_debt: '+', asset_prices: '+', credit_to_gdp_gap: '+' },
  'spend -1':    { output: '-', unemployment: '+', inflation: '-', govt_debt: '-', asset_prices: '-', credit_to_gdp_gap: '-' },
  'print +1':    { output: '~', unemployment: '~', inflation: '+', govt_debt: '-', asset_prices: '+', credit_to_gdp_gap: '+' },
};
const moves = [['policy_rate', -0.25, 'rate -0.25'], ['policy_rate', 0.25, 'rate +0.25'],
  ['tax_rate', -1, 'tax -1'], ['tax_rate', 1, 'tax +1'],
  ['govt_spending', 1, 'spend +1'], ['govt_spending', -1, 'spend -1'],
  ['money_printed', 1, 'print +1']];
const rows = [];
for (const [d, delta, name] of moves) {
  const r = shock(d, delta, 24);
  const row = { action: name };
  for (const k of KEYS) {
    const tol = k === 'unemployment' ? 1e-4 : k === 'credit_to_gdp_gap' ? 1e-4 : 1e-4;
    row[k] = `${sgn(r[k], tol)} (${f(r[k], 3)})  doc:${doc[name][k]}`;
  }
  rows.push(row);
}
console.table(rows);

console.log('\n=== F5: is the slack conditional visible at REALISTIC gaps? ===');
console.log('  +1pp of government spending, 24 months, from several starting gaps');
const settings = [
  ['calm  (rate 2.5)', {}, 36],
  ['rate 3.5', { policy_rate: 3.5 }, 36],
  ['rate 4.5', { policy_rate: 4.5 }, 36],
  ['rate 6',   { policy_rate: 6.0 }, 36],
  ['rate 8',   { policy_rate: 8.0 }, 36],
  ['rate 1.5', { policy_rate: 1.5 }, 36],
];
const t2 = [];
for (const [name, over, settle] of settings) {
  const a = ctx(over); const b = ctx(over);
  step(a, settle); step(b, settle);
  const gap0 = a.s.output_gap, u0 = a.s.unemployment;
  b.s.govt_spending += 1; b.s.govt_purchases += 1;
  step(a, 24); step(b, 24);
  t2.push({ setting: name, startGap: +gap0.toFixed(2), startU: +u0.toFixed(2),
    dOutput: +(b.s.output - a.s.output).toFixed(3),
    dInflation: +(b.s.inflation - a.s.inflation).toFixed(3),
    dUnemp: +(b.s.unemployment - a.s.unemployment).toFixed(3) });
}
console.table(t2);

console.log('\n=== F6: where does the lower-bound damping come from? ===');
const t3 = [];
for (const r of [8, 6, 4, 2.5, 1, 0.25, -0.5, -0.75]) {
  const a = ctx({ policy_rate: r }); const b = ctx({ policy_rate: r });
  step(a, 36); step(b, 36);
  const preI = b.s.investment, preSpread = b.s.credit_spread, preUC = b.s.user_cost;
  b.s.policy_rate -= 0.25;
  step(a, 12); step(b, 12);
  t3.push({ startRate: r, gapBefore: +a.s.output_gap.toFixed(2),
    dOutput12m: +(b.s.output - a.s.output).toFixed(4),
    dInvest12m: +(b.s.investment - a.s.investment).toFixed(4),
    I_before: +preI.toFixed(3), spread_before: +preSpread.toFixed(3),
    userCost_before: +preUC.toFixed(3) });
}
console.table(t3);
console.log('  investment clamp is [2,45]; ELB is', P.SS_ELB.value);

console.log('\n=== A/Tax: the austerity paradox — does revenue rise when you hike tax into a slump? ===');
for (const [name, over] of [['deep slump (rate 9)', { policy_rate: 9 }], ['calm', {}]]) {
  const a = ctx(over); const b = ctx(over);
  step(a, 36); step(b, 36);
  const gap0 = a.s.output_gap;
  applyDialChange(b.s, b.pipeline, 'tax_rate', b.s.tax_rate + 3);
  step(a, 24); step(b, 24);
  console.log(`  ${name.padEnd(20)} startGap ${f(gap0, 2)} -> ` +
    `Δrevenue ${f(b.s.tax_revenue - a.s.tax_revenue, 3)}  ` +
    `Δoutput ${f(b.s.output - a.s.output, 3)}  Δdeficit ${f(b.s.deficit - a.s.deficit, 3)}  ` +
    `Δdebt ${f(b.s.govt_debt - a.s.govt_debt, 3)}`);
}
