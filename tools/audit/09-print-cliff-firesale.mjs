import { ctx, step, f, P, SCENARIOS, applyDialChange, applyAutopilot, START } from './h.mjs';

console.log('START.private_credit_gdp =', START.private_credit_gdp,
            '  bubble override =', SCENARIOS.bubble.overrides.private_credit_gdp);

console.log('\n=== WHY does printing raise output? decompose investment ===');
{
  const a = ctx(); const b = ctx();
  step(a, 24); step(b, 24);
  b.s.money_printed = 2;
  step(a, 1); step(b, 1);
  const cro = P.CROWDING_OUT.value;
  for (const [n, c] of [['no print', a], ['print 2', b]]) {
    const s = c.s;
    const slack = Math.max(0, Math.min(1, -s.output_gap / 2));
    const atELB = s.policy_rate <= P.SS_ELB.value + 0.26;
    const de = s.deficit - s.deficit_ss;
    console.log(`  ${n.padEnd(9)} deficit ${f(s.deficit, 3)} (ss ${f(s.deficit_ss, 3)})  excess ${f(de, 3)}  ` +
      `slack ${f(slack, 2)}  crowding term ${f(atELB ? 0 : -cro * de * (1 - slack), 4)}  I ${f(s.investment, 4)}`);
  }
  console.log('  -> the ONLY route from the print dial into demand is the crowding-out term,');
  console.log('     and investment.js switches that term OFF exactly when there is slack.');
  const t = [];
  for (const rate of [1.5, 2.5, 3.5, 4.5, 5.5, 6.5]) {
    const x = ctx({ policy_rate: rate }); const y = ctx({ policy_rate: rate });
    step(x, 24); step(y, 24);
    const g0 = x.s.output_gap;
    y.s.money_printed = 2;
    step(x, 12); step(y, 12);
    t.push({ rate, startGap: +g0.toFixed(2), slackFactor: +Math.min(1, Math.max(0, -g0 / 2)).toFixed(2),
      dOutput12m: +(y.s.output - x.s.output).toFixed(3),
      dInflation12m: +(y.s.inflation - x.s.inflation).toFixed(3) });
  }
  console.table(t);
  console.log('  doc 02 DIAL 5 says the opposite: slack -> money works on OUTPUT;');
  console.log('  no slack -> money goes to PRICES.');
}

console.log('\n=== where is the policy-rate cliff? (bisect on 96-month inflation) ===');
{
  function inflAt(rate) {
    const c = ctx();
    try { step(c, 12); applyDialChange(c.s, c.pipeline, 'policy_rate', rate); step(c, 84); }
    catch { return Infinity; }
    return c.s.inflation;
  }
  let lo = 1.0, hi = 2.5;                    // lo blows up, hi is fine
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (inflAt(mid) > 25) lo = mid; else hi = mid;
  }
  console.log(`  cliff between ${lo.toFixed(4)} and ${hi.toFixed(4)} % policy rate`);
  for (const r of [1.6, 1.7, 1.75, 1.8, 1.9, 2.0]) {
    console.log(`    rate ${r}  ->  inflation after 8y = ${f(inflAt(r), 2)}`);
  }
  console.log('  the dial STEP is 0.25pp. Neutral is 2.5.');
}

console.log('\n=== scenarios under the Taylor benchmark the game scores you against ===');
{
  for (const [key, sc] of Object.entries(SCENARIOS)) {
    const c = ctx(sc.overrides);
    const snap = [];
    let died = null;
    for (let m = 1; m <= 96; m++) {
      try {
        step(c, 1, { events: false, assertEveryTick: false, endings: true, autopilot: applyAutopilot });
      } catch (e) { died = e.message.slice(0, 40); break; }
      if (c.s.ending) { died = 'ENDING ' + c.s.ending.key + ' @' + m; break; }
      if ([6, 24, 48, 96].includes(m)) snap.push(`${m}m: gap ${c.s.output_gap.toFixed(1)} pi ${c.s.inflation.toFixed(1)} u ${c.s.unemployment.toFixed(1)} i ${c.s.policy_rate.toFixed(1)}`);
    }
    console.log(`  ${key.padEnd(12)} ${snap.join(' | ')}${died ? '  ** ' + died : ''}`);
  }
}

console.log('\n=== the fire-sale term: can it EVER fire? ===');
{
  console.log('  leverage = (private_credit/credit_ss) / (asset_prices/asset_fundamental)');
  console.log(`  credit_ss = START.private_credit_gdp = ${START.private_credit_gdp} (canonical, NOT the scenario value)`);
  for (const [key, sc] of Object.entries(SCENARIOS)) {
    const c = ctx(sc.overrides);
    let maxLev = 0, fired = 0;
    for (let m = 1; m <= 96; m++) {
      try { step(c); } catch { break; }
      maxLev = Math.max(maxLev, c.s.leverage);
      if (c.s.leverage > c.s.leverage_max) fired++;
      if (c.s.ending) break;
    }
    console.log(`  ${key.padEnd(12)} max leverage ${f(maxLev, 3)} (threshold ${c.s.leverage_max})  months with forced selling: ${fired}`);
  }
}

console.log('\n=== the doom loop: does bank capital ever force anything? ===');
{
  const c = ctx(SCENARIOS.bubble.overrides);
  let minCap = 99;
  for (let m = 1; m <= 96; m++) { try { step(c); } catch { break; } minCap = Math.min(minCap, c.s.bank_capital_ratio); if (c.s.ending) break; }
  console.log(`  bubble: min bank_capital_ratio over 96m = ${f(minCap, 3)}  (regulatory min in params: ` +
    `BANK_CAPITAL_DELEVER_TRIGGER=${P.BANK_CAPITAL_DELEVER_TRIGGER.value}, BANK_CAPITAL_TO_GDP=${P.BANK_CAPITAL_TO_GDP.value})`);
  console.log('  credit.js: bank capital enters ONLY as -0.15*(ratio-13) in the spread. No lending cut.');
}
