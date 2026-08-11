import { ctx, step, stepHolding, f, P, applyDialChange } from './h.mjs';

function atGap(g) { const c = ctx(); step(c, 12); stepHolding(c, 36, g); c.nx = g; return c; }
function clone(c) { const d = ctx(); Object.assign(d.s, JSON.parse(JSON.stringify(c.s))); d.nx = c.nx; return d; }

console.log('=== the labour-hoarding switch: stimulus that RAISES unemployment ===');
{
  const rows = [];
  for (const g of [-2.0, -1.8, -1.6, -1.4, -1.2, -1.0, -0.8, -0.6]) {
    const seed = atGap(g);
    const a = clone(seed), b = clone(seed);
    b.s.govt_spending += 1; b.s.govt_purchases += 1;
    stepHolding(a, 24, a.nx); stepHolding(b, 24, b.nx);
    rows.push({ startGap: +seed.s.output_gap.toFixed(2),
      dUnemp24m: +(b.s.unemployment - a.s.unemployment).toFixed(3),
      dOutput24m: +(b.s.output - a.s.output).toFixed(3),
      'okun beta base': +a.s.okun_beta_effective.toFixed(2),
      'okun beta shocked': +b.s.okun_beta_effective.toFixed(2) });
  }
  console.table(rows);
  console.log(`  labour.js: hoarding = output_gap < -2.0 -> beta ${P.OKUN_LABOUR_HOARDING.value}, else ${P.OKUN_BETA.value}`);
  console.log('  target_u = u* - beta*gap, so crossing -2.0 upward DOUBLES beta and raises target_u.');
}

console.log('\n=== hiring/firing asymmetry: does unemployment rise faster than it falls? ===');
{
  const seed = atGap(0);
  const up = clone(seed), down = clone(seed);
  const rows = [];
  for (let m = 1; m <= 24; m++) {
    stepHolding(up, 1, -3); stepHolding(down, 1, +3);
    if (m <= 6 || m % 6 === 0) rows.push({ m,
      'u after -3 demand': +up.s.unemployment.toFixed(3),
      'u after +3 demand': +down.s.unemployment.toFixed(3),
      'rise': +(up.s.unemployment - 5).toFixed(3),
      'fall': +(5 - down.s.unemployment).toFixed(3),
      'rise/fall': +((up.s.unemployment - 5) / (5 - down.s.unemployment)).toFixed(3) });
  }
  console.table(rows);
  console.log(`  FIRING_SPEED ${P.FIRING_SPEED.value} vs HIRING_SPEED ${P.HIRING_SPEED.value}`);
}

console.log('\n=== when does inflation PEAK after a rate move? doc says 24 months. ===');
{
  const seed = atGap(0);
  const a = clone(seed), b = clone(seed);
  applyDialChange(b.s, b.pipeline, 'policy_rate', b.s.policy_rate + 1);
  let best = { m: 0, v: 0 };
  const path = [];
  for (let m = 1; m <= 48; m++) {
    stepHolding(a, 1, a.nx); stepHolding(b, 1, b.nx);
    const d = b.s.inflation - a.s.inflation;
    if (Math.abs(d) > Math.abs(best.v)) best = { m, v: d };
    if ([1, 3, 6, 9, 12, 18, 24, 36, 48].includes(m)) path.push({ m, dInflation: +d.toFixed(4),
      dOutput: +(b.s.output - a.s.output).toFixed(4), dUnemp: +(b.s.unemployment - a.s.unemployment).toFixed(4) });
  }
  console.table(path);
  console.log(`  largest |Δinflation| within 48m at month ${best.m} (${f(best.v, 4)}) — monotone, no peak.`);
}

console.log('\n=== does beating inflation cost you credibility? (prototype defect 3) ===');
{
  const c = ctx({ inflation: 6, expected_inflation: 5, credibility: 0.6, policy_rate: 1 });
  step(c, 6);
  applyDialChange(c.s, c.pipeline, 'policy_rate', 6);
  const rows = [];
  for (let m = 1; m <= 48; m++) {
    step(c);
    if ([1, 6, 12, 18, 24, 36, 48].includes(m)) rows.push({ m,
      inflation: +c.s.inflation.toFixed(2), credibility: +c.s.credibility.toFixed(4),
      unemployment: +c.s.unemployment.toFixed(2), approval: +c.s.approval.toFixed(1) });
  }
  console.table(rows);
}

console.log('\n=== deflation: is the -4 floor reachable, and what happens there? ===');
{
  const c = ctx({ policy_rate: 7 });
  const rows = [];
  for (let m = 1; m <= 96; m++) {
    try { step(c); } catch (e) { rows.push({ m, note: e.message.slice(0, 50) }); break; }
    if ([12, 24, 36, 48, 72, 96].includes(m)) rows.push({ m, inflation: +c.s.inflation.toFixed(2),
      gap: +c.s.output_gap.toFixed(2), unemp: +c.s.unemployment.toFixed(2),
      debt: +c.s.govt_debt.toFixed(0), yield: +c.s.yield_10y.toFixed(2),
      wage_growth: +c.s.wage_growth.toFixed(2), credibility: +c.s.credibility.toFixed(3) });
  }
  console.table(rows);
  console.log('  prices.js floors inflation at -4 with s.inflation = Math.max(-4, total).');
  console.log('  a hard floor on a FLOW means the debt-erosion term stops responding too.');
}
