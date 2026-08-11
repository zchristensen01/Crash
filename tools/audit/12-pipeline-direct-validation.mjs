import { ctx, step, stepHolding, f, P, applyDialChange } from './h.mjs';

function atGap(g) { const c = ctx(); step(c, 12); c.s.net_exports = g; step(c, 24); return c; }
function clone(c) { const d = ctx(); Object.assign(d.s, JSON.parse(JSON.stringify(c.s))); return d; }

console.log('=== the pipeline, direct: schedule an ABSURD amount and see if anything moves ===');
{
  const seed = atGap(0);
  const a = clone(seed), b = clone(seed);
  b.pipeline.schedule('consumption', 500, 'spending_to_output', 'absurd', b.s.tick);
  try {
    step(b, 1);
    console.log('  scheduling into a rule-owned field was ACCEPTED — the bug is back');
  } catch (e) {
    console.log('  scheduling into a rule-owned field now throws:');
    console.log('   ', e.message.split('\n')[0]);
  }
  // ...and a legitimate schedule does reach the model.
  const c = clone(seed);
  c.pipeline.schedule('policy_rate_demand', -2, 'rate_to_investment', 'probe', c.s.tick);
  for (let m = 1; m <= 24; m++) { step(a); step(c); }
  console.log(`  a -2pp transmitted-rate schedule, 24 months later:`);
  console.log(`    Δpolicy_rate_demand ${f(c.s.policy_rate_demand - a.s.policy_rate_demand, 4)}` +
              `   Δoutput ${f(c.s.output - a.s.output, 4)}   Δinvestment ${f(c.s.investment - a.s.investment, 4)}`);
}

console.log('\n=== VALIDATION TARGETS the model is never checked against ===');
{
  const seed = atGap(0);
  // RATE_TO_OUTPUT / RATE_TO_INFLATION: 1pp rate held for a year
  {
    const a = clone(seed), b = clone(seed);
    b.s.policy_rate += 1;
    step(a, 12); step(b, 12);
    console.log(`  RATE_TO_OUTPUT     target ${P.RATE_TO_OUTPUT.value}% [${P.RATE_TO_OUTPUT.low}-${P.RATE_TO_OUTPUT.high}]` +
      `   model ${f(-(b.s.output - a.s.output), 3)}%`);
    console.log(`  RATE_TO_INFLATION  target ${P.RATE_TO_INFLATION.value}pp [${P.RATE_TO_INFLATION.low}-${P.RATE_TO_INFLATION.high}]` +
      `   model ${f(-(b.s.inflation - a.s.inflation), 3)}pp`);
  }
  // TAX_SHOCK_TO_GDP: 1% of GDP tax rise over 2-3 years
  {
    const a = clone(seed), b = clone(seed);
    b.s.tax_rate += 1;
    step(a, 30); step(b, 30);
    console.log(`  TAX_SHOCK_TO_GDP   target ${P.TAX_SHOCK_TO_GDP.value}% [${P.TAX_SHOCK_TO_GDP.low}-${P.TAX_SHOCK_TO_GDP.high}]` +
      `   model ${f(-(b.s.output - a.s.output) / b.s.output * 100, 3)}%`);
  }
  // PERSONAL_TAX_RATE_TO_GDP / CORPORATE_TAX_RATE_TO_GDP: 1pp cut, ~3 quarters
  {
    const a = clone(seed), b = clone(seed);
    b.s.tax_rate -= 1;
    step(a, 9); step(b, 9);
    console.log(`  PERSONAL_TAX_TO_GDP target ${P.PERSONAL_TAX_RATE_TO_GDP.value}% ` +
      `  model ${f((b.s.output - a.s.output) / b.s.output * 100, 3)}%  ` +
      `(Δinvestment ${f(b.s.investment - a.s.investment, 4)} — CORPORATE_TAX_RATE_TO_GDP has no dial)`);
  }
}

console.log('\n=== printing 5% of GDP at the calm baseline: where does the inflation come from? ===');
{
  const a = clone(atGap(0)); const b = clone(atGap(0));
  b.s.money_printed = 5;
  console.log('  m   Δinfl  passthrough  Δgap  kappa*gap contribution  credibility  Δinvestment');
  for (let m = 1; m <= 60; m++) {
    step(a); step(b);
    if ([1, 6, 12, 24, 36, 48, 60].includes(m)) {
      console.log('  ' + String(m).padStart(3) +
        f(b.s.inflation - a.s.inflation, 3).padStart(8) +
        f(b.s.monetisation_passthrough, 3).padStart(13) +
        f(b.s.output_gap - a.s.output_gap, 3).padStart(7) +
        f(b.s.kappa_effective * b.s.output_gap - a.s.kappa_effective * a.s.output_gap, 3).padStart(24) +
        f(b.s.credibility, 3).padStart(13) +
        f(b.s.investment - a.s.investment, 3).padStart(13));
    }
  }
  console.log('  MONETISATION_SLACK_GATE = 1pp, so any slack >= 1pp shuts the money channel entirely;');
  console.log('  MONETISATION_CREDIBILITY_GATE = 0.5, and calm credibility is', f(a.s.credibility, 2) + '.');
  console.log('  Both factors are zero at the baseline, so the product is zero.');
}
