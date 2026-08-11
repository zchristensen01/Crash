import { ctx, step, f, P, SCENARIOS, newState, run, applyDialChange, RULES } from './h.mjs';

console.log('=== AUTO_STABILISER_ABSORPTION: does the model reproduce 0.60? ===');
{
  // A real demand shock the model actually transmits: cut G by 5pp.
  // Absorption = 1 - (output fall with stabilisers) / (output fall without).
  const teq = P.AUTOSTAB_TAX_ELASTICITY.value;
  const beq = P.AUTOSTAB_BENEFIT_ELASTICITY.value;
  function armFall(on) {
    P.AUTOSTAB_TAX_ELASTICITY.value = on ? teq : 0;
    P.AUTOSTAB_BENEFIT_ELASTICITY.value = on ? beq : 0;
    const a = ctx(); const b = ctx();
    step(a, 36); step(b, 36);
    b.s.govt_spending -= 5; b.s.govt_purchases -= 5;
    step(a, 12); step(b, 12);
    return { dY: b.s.output - a.s.output, dYd: b.s.disposable_income - a.s.disposable_income };
  }
  const on = armFall(true), off = armFall(false);
  P.AUTOSTAB_TAX_ELASTICITY.value = teq; P.AUTOSTAB_BENEFIT_ELASTICITY.value = beq;
  console.log(`  output fall WITH stabilisers    ${f(on.dY, 4)}   (Δdisposable income ${f(on.dYd, 4)})`);
  console.log(`  output fall WITHOUT stabilisers ${f(off.dY, 4)}   (Δdisposable income ${f(off.dYd, 4)})`);
  console.log(`  absorption = 1 - ${f(on.dY, 4)}/${f(off.dY, 4)} = ${f(1 - on.dY / off.dY, 4)}   target 0.60`);
  console.log('  NOTE the sign of Δdisposable income: the stabilisers RAISE household income');
  console.log('  in a slump, because market income in fiscal.js is the constant 100.');
}

console.log('\n=== do the SCENARIOS produce the regimes they advertise? ===');
{
  const rows = [];
  for (const [key, sc] of Object.entries(SCENARIOS)) {
    const c = ctx(sc.overrides);
    const snap = [];
    for (let m = 1; m <= 48; m++) {
      step(c);
      if ([1, 6, 12, 24, 48].includes(m)) snap.push(`${m}m: gap ${c.s.output_gap.toFixed(1)} pi ${c.s.inflation.toFixed(1)} u ${c.s.unemployment.toFixed(1)}`);
    }
    rows.push({ scenario: key, path: snap.join(' | ') });
  }
  for (const r of rows) console.log(`  ${r.scenario.padEnd(12)} ${r.path}`);
  console.log('  (no policy at all — the honest baseline the demo advertises)');
}

console.log('\n=== SECTION D: identities that invariants.js does NOT check ===');
{
  const c = ctx();
  const bad = { capital: 0, credit: 0, money: 0, demand: 0 };
  let worst = { capital: 0, credit: 0, money: 0 };
  for (let m = 1; m <= 120; m++) {
    const prev = { ...c.s };
    step(c);
    // capital law of motion: K[t] = (1-delta_m)K[t-1] + I_m, with I = LAST tick's investment
    const deltaM = P.DEPRECIATION_RATE.value / 12;
    const expectK = prev.capital_stock * (1 - deltaM) + prev.investment / 12;
    worst.capital = Math.max(worst.capital, Math.abs(c.s.capital_stock - expectK));
    // credit stock vs its own flow
    const g = (c.s.credit_growth_annual - (c.s.potential_growth + c.s.inflation)) / 100 / 12;
    const expectC = prev.private_credit * (1 + g);
    worst.credit = Math.max(worst.credit, Math.abs(c.s.private_credit - expectC));
    // money identity
    // money_supply is gone (docs/07 M3). What replaces the identity check is
    // that price_level tracks cumulative inflation, which invariants.js now
    // asserts every tick.
    const expectP = prev.price_level * (1 + c.s.inflation / 100 / 12);
    worst.money = Math.max(worst.money, Math.abs(c.s.price_level - expectP));
  }
  console.log(`  capital law of motion  max |K - ((1-d)K' + I')|      = ${worst.capital.toExponential(2)}`);
  console.log(`  credit stock vs flow   max |C - C'(1+g)|             = ${worst.credit.toExponential(2)}`);
  console.log(`  price level vs cumulative inflation  max residual  = ${worst.money.toExponential(2)}`);
  console.log(`  final: P=${f(c.s.price_level)} V=${f(c.s.velocity)} (velocity is now read by ` +
              `the monetisation gate; money_supply and wage_level are deleted)`);
}

console.log('\n=== SECTION E: full-range dial sweep, 96 months, looking for sign flips ===');
{
  for (const dial of ['policy_rate', 'tax_rate', 'govt_spending', 'money_printed']) {
    const grid = { policy_rate: [-0.75, 0, 1, 2, 2.5, 3, 4, 6, 8, 12, 16, 20],
                   tax_rate: [10, 18, 22, 24.75, 28, 32, 40, 55, 70],
                   govt_spending: [5, 12, 18, 22, 26, 30, 40, 55, 70],
                   money_printed: [0, 0.5, 1, 2, 3, 5, 8, 12, 15] }[dial];
    const out = [];
    for (const v of grid) {
      const c = ctx();
      step(c, 12);
      applyDialChange(c.s, c.pipeline, dial, v);
      let err = null;
      try { step(c, 84); } catch (e) { err = e.message.slice(0, 44); }
      out.push({ [dial]: v,
        output: err ? 'ERR' : +c.s.output.toFixed(1),
        gap: err ? '' : +c.s.output_gap.toFixed(1),
        infl: err ? '' : +c.s.inflation.toFixed(1),
        unemp: err ? '' : +c.s.unemployment.toFixed(1),
        debt: err ? '' : +c.s.govt_debt.toFixed(0),
        note: err || '' });
    }
    console.log(`\n  --- ${dial} ---`);
    console.table(out);
  }
}
