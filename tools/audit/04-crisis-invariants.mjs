import { ctx, step, f, OPTS, EVENTS, P, RULES, newState, run } from './h.mjs';

console.log('RULES.length =', RULES.length, '(index.js says "23 rules")');

console.log('\n=== does a FINANCIAL CRISIS actually cause a recession? ===');
{
  const a = ctx(); const b = ctx();
  step(a, 24); step(b, 24);
  const crisis = EVENTS.find((e) => e.key === 'financial_crisis');
  crisis.apply(b.s);
  console.log('  month  Δoutput  Δpotential  Δgap   Δunemp  Δinfl  crisis_drag  scar  Δassets');
  for (let m = 1; m <= 60; m++) {
    step(a); step(b);
    if (m <= 6 || m % 6 === 0) {
      console.log('  ' + String(m).padStart(5) +
        f(b.s.output - a.s.output).padStart(9) +
        f(b.s.potential_output - a.s.potential_output).padStart(12) +
        f(b.s.output_gap - a.s.output_gap).padStart(7) +
        f(b.s.unemployment - a.s.unemployment).padStart(8) +
        f(b.s.inflation - a.s.inflation).padStart(7) +
        f(b.s.crisis_drag).padStart(13) +
        f(b.s.scar).padStart(7) +
        f(b.s.asset_prices - a.s.asset_prices).padStart(9));
    }
  }
  console.log('  peak-to-trough output fall vs baseline: see column 1. Literature: ~9%.');
  console.log('  crisis_drag is written by crisis.js and read by NOTHING (grep).');
  console.log('  recap_promptness is only ever set to 0 (events.js); nothing can raise it.');
}

console.log('\n=== does a default run with events + invariants survive? ===');
for (const seed of [1, 2, 3, 7, 40317]) {
  const s = newState();
  try {
    run(s, 96, { seed });
    console.log(`  seed ${String(seed).padStart(5)}: completed, ending=${s.ending?.key ?? 'none'} at tick ${s.tick}`);
  } catch (e) {
    console.log(`  seed ${String(seed).padStart(5)}: THREW -> ${e.message}`);
  }
}

console.log('\n=== is the "collateral" term in updateAssetPrices a stale-inflation artefact? ===');
{
  // excessCredit = max(0, credit_growth_annual[t-1] - (potential_growth + inflation[t]))
  // and credit_growth_annual[t-1] = potential_growth + inflation[t-1] + impulse[t-1].
  // So the term equals max(0, inflation[t-1] - inflation[t] + impulse[t-1]).
  const c = ctx();
  step(c, 24);
  const hist = [];
  for (let m = 0; m < 6; m++) {
    const prevInfl = c.s.inflation, prevCGA = c.s.credit_growth_annual, prevImp = c.s.credit_impulse;
    step(c);
    hist.push({ m, 'infl[t-1]': +prevInfl.toFixed(4), 'infl[t]': +c.s.inflation.toFixed(4),
      'cga[t-1]': +prevCGA.toFixed(4), 'impulse[t-1]': +prevImp.toFixed(4),
      'excessCredit read by assets': +Math.max(0, prevCGA - (c.s.potential_growth + c.s.inflation)).toFixed(4),
      'identity: i[t-1]-i[t]+imp': +Math.max(0, prevInfl - c.s.inflation + prevImp).toFixed(4) });
  }
  console.table(hist);
}


console.log('\n=== ZLB ===');
console.log('  The tax-offset version of this experiment cannot be run: holding the gap at');
console.log('  zero at a low policy rate needs a tax rate high enough to send govt_debt to');
console.log('  Infinity inside 60 ticks (see 06-stabilisers-scenarios-sweep.mjs).');
console.log('  The decisive, divergence-free version — identical state, only the rate level');
console.log('  differs, one tick — is in 05-crash-rate-zlb-doublecount.mjs. It shows the');
console.log('  response is bit-identical (0.084375) from a 10% rate down to -0.74%, because');
console.log('  investment.js rateTerm = -investment_share * (ELASTICITY/100) * d(user_cost)');
console.log('  = -22.5 * 0.015 * dr, which carries no dependence on the level of r.');
