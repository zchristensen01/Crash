import { ctx, step, f, P, SCENARIOS, newState, run, applyDialChange, RULES } from './h.mjs';

console.log('=== F3 live: what does updateBondYield see on tick 0? ===');
{
  const s = newState();
  console.log('  newState().interest_cost =', s.interest_cost);
  const share = s.interest_cost / Math.max(1, s.tax_revenue);
  console.log('  interestShare = undefined/24.75 =', share, '   (share > 0.25) ->', share > 0.25);
  console.log('  so panic = 0 by accident, not by design: NaN>x is false.');
  const declared = ['mpc_effective', 'market_rate', 'user_cost', 'okun_beta_effective',
    'loan_losses', 'credit_impulse', 'risk_premium', 'interest_cost', 'fired_event', 'ending_counters'];
  console.log('  fields absent from newState():',
    declared.filter((k) => !(k in s)).join(', '));
}

console.log('\n=== does the game END gracefully at extreme dial settings? (endings ON, as shipped) ===');
{
  const rows = [];
  for (const [dial, vals] of Object.entries({
    policy_rate: [0, 1, 6, 8, 12, 20],
    govt_spending: [5, 26, 30, 70],
    money_printed: [3, 5, 15],
    tax_rate: [10, 70],
  })) {
    for (const v of vals) {
      const c = ctx();
      step(c, 12);
      applyDialChange(c.s, c.pipeline, dial, v);
      let err = null, m = 0;
      for (; m < 84 && !c.s.ending; m++) {
        try { step(c, 1, { events: false, assertEveryTick: true, endings: true }); }
        catch (e) { err = e.message.slice(0, 60); break; }
      }
      rows.push({ dial, value: v, endedAt: 12 + m, ending: c.s.ending?.key ?? '-',
        thrown: err ?? '-', infl: +c.s.inflation.toFixed(1) });
    }
  }
  console.table(rows);
}

console.log('\n=== the BUBBLE scenario: are the visible gauges really fine? ===');
{
  const c = ctx(SCENARIOS.bubble.overrides);
  console.log('  m   gap   infl  unemp  approval  creditGap  leverage  assets/fund  crisisProb%');
  for (let m = 1; m <= 96; m++) {
    step(c);
    if ([1, 6, 12, 24, 36, 48, 72, 96].includes(m)) {
      console.log('  ' + String(m).padStart(3) +
        f(c.s.output_gap, 1).padStart(6) + f(c.s.inflation, 1).padStart(7) +
        f(c.s.unemployment, 1).padStart(7) + f(c.s.approval, 0).padStart(10) +
        f(c.s.credit_to_gdp_gap, 1).padStart(11) + f(c.s.leverage, 2).padStart(10) +
        f(c.s.asset_prices / c.s.asset_fundamental, 2).padStart(13) +
        f(c.s.crisis_prob, 1).padStart(12));
    }
  }
}

console.log('\n=== PRINT: is it modelled as a FINANCING choice? ===');
{
  const a = ctx(); const b = ctx();
  step(a, 24); step(b, 24);
  applyDialChange(b.s, b.pipeline, 'money_printed', 2);
  step(a, 24); step(b, 24);
  console.log(`  Δdeficit ${f(b.s.deficit - a.s.deficit, 3)}  Δdebt ${f(b.s.govt_debt - a.s.govt_debt, 2)}` +
    `  Δgovt_purchases ${f(b.s.govt_purchases - a.s.govt_purchases, 3)}` +
    `  Δgap ${f(b.s.output_gap - a.s.output_gap, 3)}`);
  console.log(`  Δoutput ${f(b.s.output - a.s.output, 3)}  Δinflation ${f(b.s.inflation - a.s.inflation, 3)}` +
    `  Δcredibility ${f(b.s.credibility - a.s.credibility, 4)}  passthrough ${f(b.s.monetisation_passthrough, 3)}`);
  console.log('  FIXED: printing now BUYS things (aggregate.js) and cancels on the');
  console.log('  financing side of the budget identity, so purchases rise and debt does not.');
  // decompose
  console.log(`  Δasset_prices ${f(b.s.asset_prices - a.s.asset_prices, 3)}  Δcredit_spread ${f(b.s.credit_spread - a.s.credit_spread, 4)}` +
              `  Δexpected_infl ${f(b.s.expected_inflation - a.s.expected_inflation, 4)}  Δuser_cost ${f(b.s.user_cost - a.s.user_cost, 4)}`);
}

console.log('\n=== PRINT with genuine slack: does output rise and inflation stay put? ===');
{
  for (const rate of [2.5, 5, 6]) {
    const a = ctx({ policy_rate: rate }); const b = ctx({ policy_rate: rate });
    step(a, 24); step(b, 24);
    const g0 = a.s.output_gap;
    b.s.money_printed = 2;
    step(a, 24); step(b, 24);
    console.log(`  rate ${String(rate).padEnd(4)} startGap ${f(g0, 2).padStart(7)}  ` +
      `Δoutput ${f(b.s.output - a.s.output, 3).padStart(7)}  Δinflation ${f(b.s.inflation - a.s.inflation, 3).padStart(7)}  ` +
      `passthrough ${f(b.s.monetisation_passthrough, 3)}`);
  }
}

console.log('\n=== is rate -> asset prices a SEPARATE 1m chain, or instant? ===');
{
  const base = ctx(); step(base, 36);
  const s0 = JSON.parse(JSON.stringify({ ...base.s, history: base.s.history }));
  const a = ctx(); const b = ctx();
  Object.assign(a.s, JSON.parse(JSON.stringify(s0)));
  Object.assign(b.s, JSON.parse(JSON.stringify(s0)));
  applyDialChange(b.s, b.pipeline, 'policy_rate', b.s.policy_rate - 1);
  const rows = [];
  for (let m = 1; m <= 12; m++) {
    step(a); step(b);
    rows.push({ m, dAssets: +(b.s.asset_prices - a.s.asset_prices).toFixed(4),
      dInvestment: +(b.s.investment - a.s.investment).toFixed(4),
      dConsumption: +(b.s.consumption - a.s.consumption).toFixed(4),
      dPrivateCredit: +(b.s.private_credit - a.s.private_credit).toFixed(4) });
  }
  console.table(rows);
  console.log('  doc 02: investment [4m lag, peak 9m]; household borrowing [3m]; assets [1m].');
}

console.log('\n=== does the confidence residual do anything? ===');
{
  const c = ctx(); step(c, 60);
  console.log('  steady-state confidence_residual =', c.s.confidence_residual);
  const d = ctx(SCENARIOS.recession.overrides); step(d, 24);
  console.log('  recession-scenario residual at 24m =', f(d.s.confidence_residual, 6),
              ' -> consumption contribution =', f(P.CONFIDENCE_INDEP_PREDICTIVE.value * d.s.confidence_residual, 6), 'pp');
}
