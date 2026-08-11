import { ctx, step, stepHolding, f, P, SCENARIOS, applyDialChange, applyAutopilot } from './h.mjs';

/**
 * Clean state-dependence test. net_exports is a purely additive demand term
 * that nothing else in the model reads, so it sets the output gap without
 * perturbing the deficit, the tax base, disposable income or the rate.
 */
function atGap(g) {
  const c = ctx();
  step(c, 12);
  stepHolding(c, 36, g);        // standing external demand shock, held
  c.nx = g;
  return c;
}
function clone(c) {
  const d = ctx();
  Object.assign(d.s, JSON.parse(JSON.stringify(c.s)));
  d.nx = c.nx;
  return d;
}

console.log('=== THE headline conditional, measured at realistic gaps ===');
console.log('  (gap set with net_exports, which nothing else reads; both arms identical)\n');
// The rate arm MUST go through applyDialChange: that is what schedules the
// move into policy_rate_demand, and assigning s.policy_rate directly now
// moves the setting and nothing else.
for (const [name, apply] of [
  ['+1pp GOVERNMENT SPENDING', (c) => { c.s.govt_spending += 1; c.s.govt_purchases += 1; }],
  ['-1pp POLICY RATE',        (c) => applyDialChange(c.s, c.pipeline, 'policy_rate', c.s.policy_rate - 1)],
]) {
  const rows = [];
  for (const g of [-6, -4, -3, -2, -1, 0, 1, 2, 3]) {
    const seed = atGap(g);
    const a = clone(seed), b = clone(seed);
    const gap0 = a.s.output_gap, u0 = a.s.unemployment;
    apply(b);
    stepHolding(a, 24, a.nx); stepHolding(b, 24, b.nx);
    const dY = b.s.output - a.s.output, dPi = b.s.inflation - a.s.inflation;
    rows.push({ startGap: +gap0.toFixed(2), startU: +u0.toFixed(2),
      dOutput: +dY.toFixed(3), dInflation: +dPi.toFixed(3),
      dUnemp: +(b.s.unemployment - a.s.unemployment).toFixed(3),
      'output share': +(dY / (dY + dPi)).toFixed(2) });
  }
  console.log(`  --- ${name}, 24 months ---`);
  console.table(rows);
}

console.log('\n=== the same, for the PRINT dial ===');
{
  const rows = [];
  for (const g of [-6, -4, -3, -2, -1, 0, 1, 2]) {
    const seed = atGap(g);
    const a = clone(seed), b = clone(seed);
    const gap0 = a.s.output_gap;
    b.s.money_printed = 2;
    stepHolding(a, 24, a.nx); stepHolding(b, 24, b.nx);
    rows.push({ startGap: +gap0.toFixed(2),
      dOutput: +(b.s.output - a.s.output).toFixed(3),
      dInflation: +(b.s.inflation - a.s.inflation).toFixed(3),
      passthrough: +b.s.monetisation_passthrough.toFixed(3),
      slackFactorInCrowding: +Math.min(1, Math.max(0, -gap0 / 2)).toFixed(2) });
  }
  console.table(rows);
  console.log('  doc 02 DIAL 5: slack -> output rises, prices barely move.');
  console.log('                 no slack -> prices rise hard.');
}

console.log('\n=== how far above potential can output actually go? ===');
{
  const rows = [];
  for (const g of [0, 2, 3.5, 4, 5, 8, 20]) {
    const c = atGap(g);
    rows.push({ setGap: g, output_gap: +c.s.output_gap.toFixed(2),
      'output/potential-1 (%)': +((c.s.output / c.s.potential_output - 1) * 100).toFixed(3),
      inflation: +c.s.inflation.toFixed(2), unemployment: +c.s.unemployment.toFixed(2) });
  }
  console.table(rows);
  console.log('  doc 02: "IF output_gap >= 0: output flat, prices up".');
  console.log('  aggregate.js: output tracks the gap 1:1 up to MAX_OVERHEAT = +4.0, then stops dead.');
}

console.log('\n=== near the policy-rate cliff ===');
{
  function inflAt(rate) {
    const c = ctx();
    try { step(c, 12); applyDialChange(c.s, c.pipeline, 'policy_rate', rate); step(c, 84); }
    catch { return Infinity; }
    return c.s.inflation;
  }
  for (const r of [1.50, 1.40, 1.35, 1.32, 1.31, 1.3071, 1.30, 1.25]) {
    console.log(`  rate ${r.toFixed(4)}  ->  inflation after 8y = ${f(inflAt(r), 2)}`);
  }
}

console.log('\n=== the bubble under the Taylor benchmark: does the crash risk survive? ===');
{
  const c = ctx(SCENARIOS.bubble.overrides);
  console.log('  m   creditGap  crisisProb%  assets/fund  inflation  rate');
  for (let m = 1; m <= 96; m++) {
    step(c, 1, { events: false, assertEveryTick: false, endings: true, autopilot: applyAutopilot });
    if ([1, 12, 24, 48, 72, 96].includes(m)) {
      console.log('  ' + String(m).padStart(3) + f(c.s.credit_to_gdp_gap, 2).padStart(11) +
        f(c.s.crisis_prob, 2).padStart(13) + f(c.s.asset_prices / c.s.asset_fundamental, 2).padStart(13) +
        f(c.s.inflation, 2).padStart(11) + f(c.s.policy_rate, 2).padStart(7));
    }
  }
  console.log('  CREDIT_GAP_CRISIS_THRESHOLD =', P.CREDIT_GAP_CRISIS_THRESHOLD.value);
}
