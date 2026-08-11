import { ctx, step, f, newState, run, SCENARIOS, P, applyDialChange } from './h.mjs';

console.log('=== how often does a real 8-year session hit the invariant crash? ===');
{
  let crashed = 0, total = 0, byTick = [];
  const perScenario = {};
  for (const key of Object.keys(SCENARIOS)) {
    let c = 0, n = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const s = newState(SCENARIOS[key].overrides);
      n++; total++;
      try { run(s, 96, { seed, assertEveryTick: true }); }
      catch (e) {
        if (/output = C\+I\+G\+NX/.test(e.message)) { c++; crashed++; byTick.push(s.tick); }
        else { c++; crashed++; }
      }
    }
    perScenario[key] = `${c}/${n} = ${(100 * c / n).toFixed(0)}%`;
  }
  console.log('  sessions ending in a thrown model error, per scenario (200 seeds each):');
  console.table(perScenario);
  console.log(`  overall ${crashed}/${total} = ${(100 * crashed / total).toFixed(1)}%`);
}

console.log('\n=== ZLB, decisive form: identical state, only the rate level differs ===');
{
  // One tick from a COMMON settled state. rateTerm is linear in the rate and
  // carries no level dependence, so if a lower bound existed this would shrink.
  const base = ctx(); step(base, 36);
  const s0 = { ...base.s, history: JSON.parse(JSON.stringify(base.s.history)) };
  const t = [];
  for (const r of [10, 6, 4, 2.5, 1, 0.25, 0, -0.5, -0.74]) {
    const a = ctx(); const b = ctx();
    Object.assign(a.s, s0, { history: JSON.parse(JSON.stringify(s0.history)) });
    Object.assign(b.s, s0, { history: JSON.parse(JSON.stringify(s0.history)) });
    applyDialChange(a.s, a.pipeline, 'policy_rate', r);
    applyDialChange(b.s, b.pipeline, 'policy_rate', r - 0.25);
    step(a, 24); step(b, 24);
    step(a); step(b);
    t.push({ rateLevel: r, dInvestment_1tick: +(b.s.investment - a.s.investment).toFixed(6),
      dOutput_1tick: +(b.s.output - a.s.output).toFixed(6) });
  }
  console.table(t);
}

console.log('\n=== ...and where the brief\'s "damping" actually comes from: MAX_OVERHEAT ===');
{
  const base = ctx(); step(base, 36);
  const s0 = { ...base.s, history: JSON.parse(JSON.stringify(base.s.history)) };
  const t = [];
  for (const g of [-4, -2, 0, 2, 3.5, 3.9, 4.2, 6]) {
    const a = ctx(); const b = ctx();
    Object.assign(a.s, s0, { history: JSON.parse(JSON.stringify(s0.history)) });
    Object.assign(b.s, s0, { history: JSON.parse(JSON.stringify(s0.history)) });
    // move the gap with spending, keep the rate identical at 2.5 in both arms
    a.s.govt_spending += g; a.s.govt_purchases += g;
    b.s.govt_spending += g; b.s.govt_purchases += g;
    applyDialChange(b.s, b.pipeline, 'policy_rate', b.s.policy_rate - 0.25);
    step(a, 24); step(b, 24);
    t.push({ gapNudge: g, gapAfter: +a.s.output_gap.toFixed(2),
      dInvestment: +(b.s.investment - a.s.investment).toFixed(6),
      dOutput: +(b.s.output - a.s.output).toFixed(6) });
  }
  console.table(t);
  console.log('  MAX_OVERHEAT in aggregate.js = 4.0. Above it, output stops responding to');
  console.log('  ANY demand lever, at ANY policy rate. That is the "lower bound" the brief saw.');
}

console.log('\n=== austerity paradox, algebraic ===');
{
  console.log('  fiscal.js: tax_revenue = tax_rate + AUTOSTAB_TAX_ELASTICITY*(tax_rate/100)*output_gap');
  const e = P.AUTOSTAB_TAX_ELASTICITY.value;
  console.log(`  AUTOSTAB_TAX_ELASTICITY = ${e}`);
  console.log('  d(revenue)/d(tax_rate) = 1 + e*gap/100  ->  negative only when gap < ' +
              `${(-100 / e).toFixed(0)}%`);
  console.log('  and the tax BASE is the constant 100 (potential), not actual output,');
  console.log('  so revenue can never fall from a tax rise in any playable state.');
  for (const [name, over] of [['calm', {}], ['recession scenario', SCENARIOS.recession.overrides]]) {
    const a = ctx(over); const b = ctx(over);
    step(a, 24); step(b, 24);
    const g0 = a.s.output_gap;
    b.s.tax_rate += 3;
    step(a, 24); step(b, 24);
    console.log(`  ${name.padEnd(20)} gap0 ${f(g0, 2)}  Δrevenue ${f(b.s.tax_revenue - a.s.tax_revenue, 3)}` +
                `  Δoutput ${f(b.s.output - a.s.output, 3)}`);
  }
}

console.log('\n=== do consumption and credit double-count the asset-price channel? ===');
{
  const base = ctx(); step(base, 36);
  const s0 = { ...base.s, history: JSON.parse(JSON.stringify(base.s.history)) };
  const a = ctx(); const b = ctx();
  Object.assign(a.s, s0, { history: JSON.parse(JSON.stringify(s0.history)) });
  Object.assign(b.s, s0, { history: JSON.parse(JSON.stringify(s0.history)) });
  b.s.asset_prices += 20;                       // a 20% asset boom, nothing else
  const rows = [];
  for (let m = 1; m <= 24; m++) {
    step(a); step(b);
    if (m <= 3 || m % 6 === 0) rows.push({ m,
      dC: +(b.s.consumption - a.s.consumption).toFixed(4),
      dCreditImpulse: +(b.s.credit_impulse - a.s.credit_impulse).toFixed(4),
      dPrivateCredit: +(b.s.private_credit - a.s.private_credit).toFixed(4),
      dInvestment: +(b.s.investment - a.s.investment).toFixed(4),
      dOutput: +(b.s.output - a.s.output).toFixed(4) });
  }
  console.table(rows);
  console.log(`  WEALTH_EFFECT = ${P.WEALTH_EFFECT.value} (${P.WEALTH_EFFECT.unit})`);
  console.log('  credit.js collateralFeedback = 0.02*(asset/fundamental - 1)*100 -> credit -> ' +
              'ASSET_PRICE_CREDIT_CHANNEL -> asset prices -> wealth effect -> consumption');
}
