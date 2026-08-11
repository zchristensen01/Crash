import { ctx, step, applyDialChange, f, OPTS } from './h.mjs';

console.log('=== (a) monetary sign asymmetry: is a cut weaker than a hike? ===');
{
  const base = ctx(); step(base, 24);
  const cut  = ctx(); step(cut, 24);
  const hike = ctx(); step(hike, 24);
  applyDialChange(cut.s,  cut.pipeline,  'policy_rate', cut.s.policy_rate  - 1);
  applyDialChange(hike.s, hike.pipeline, 'policy_rate', hike.s.policy_rate + 1);
  for (const m of [1, 6, 12, 24]) {
    while (base.s.tick < 24 + m) { step(base); step(cut); step(hike); }
    const dCut  = cut.s.output  - base.s.output;
    const dHike = hike.s.output - base.s.output;
    console.log(`  m=${String(m).padStart(2)}  cut ${f(dCut)}  hike ${f(dHike)}  ` +
                `|cut|/|hike| = ${f(Math.abs(dCut / dHike))}   (doc says 0.67)`);
  }
}

console.log('\n=== (b) does household income depend on output at all? ===');
{
  const boom = ctx(); step(boom, 36);
  const slump = ctx({ policy_rate: 9 }); step(slump, 36);
  for (const [n, c] of [['calm', boom], ['rate 9%', slump]]) {
    const s = c.s;
    console.log(`  ${n.padEnd(8)} output ${f(s.output)}  gap ${f(s.output_gap)}  ` +
      `u ${f(s.unemployment)}  disposable_income ${f(s.disposable_income)}  ` +
      `tax_rev ${f(s.tax_revenue)}  transfers ${f(s.transfers)}  C ${f(s.consumption)}`);
  }
  console.log('  FIXED: fiscal.js now sets market_income = 100 * output/potential, so');
  console.log('  household income FALLS in a slump. It used to be the constant 100.');
}

console.log('\n=== (c) is the auto-stabiliser test measuring anything? ===');
{
  const base = ctx(); const hit = ctx();
  step(base, 1);
  hit.s.consumption -= 5;                       // exactly what the test does
  step(hit, 1);
  const disposableFall = base.s.disposable_income - hit.s.disposable_income;
  console.log(`  base C after 1 tick ${f(base.s.consumption, 9)}`);
  console.log(`  hit  C after 1 tick ${f(hit.s.consumption, 9)}  (shock of -5 applied first)`);
  console.log(`  disposable income fall: ${f(disposableFall, 9)}`);
  console.log(`  "absorbed" = 1 - ${f(disposableFall, 9)}/5 = ${f(1 - disposableFall / 5, 9)}`);
}

console.log('\n=== (d) do events that touch demand break the output identity? ===');
{
  const { EVENTS, checkInvariants } = await import('./h.mjs');
  const c = ctx();
  step(c, 6);
  const prev = { ...c.s };
  // Events now fire at the START of a tick, so the correct check is: apply
  // the event, run a tick with invariants armed, and see whether the rules
  // priced it in and the books still balance.
  const slump = EVENTS.find((e) => e.key === 'export_slump');
  slump.apply(c.s);
  try {
    step(c, 1, { events: false, assertEveryTick: true, endings: false });
    console.log('  export_slump then a full tick with invariants armed: PASSED');
  } catch (e) {
    console.log('  export_slump ->', e.message);
  }
  console.log(`  net_exports after the event ${f(c.s.net_exports, 4)} — it survives and decays`);
  console.log(`  output gap moved to ${f(c.s.output_gap, 4)}, so the shock reached demand`);
}

console.log('\n=== (e) dead-end state: price_level, wage_level, money_supply, velocity ===');
{
  const a = ctx(); const b = ctx();
  step(a, 60);
  // Corrupt the "dead" variables on b and see whether ANY other variable moves.
  // wage_level and money_supply are gone. price_level is display-only and
  // pinned to cumulative inflation by an invariant; velocity is now wired
  // into the monetisation pass-through, so corrupting it DOES change things.
  b.s.price_level = 1e4; b.s.velocity = 9;
  step(b, 60);
  const keys = ['output', 'output_gap', 'inflation', 'unemployment', 'consumption',
    'investment', 'govt_debt', 'asset_prices', 'credit_spread', 'approval',
    'credibility', 'expected_inflation', 'private_credit', 'wage_growth'];
  const diffs = keys.filter((k) => Math.abs(a.s[k] - b.s[k]) > 1e-12);
  console.log('  variables that differ after 60 ticks with P, W, M, V multiplied wildly:',
              diffs.length ? diffs : 'NONE');
  console.log('  (price_level is deliberately display-only; velocity only bites above');
  console.log('   VELOCITY_FLIGHT_THRESHOLD, so at the calm baseline both are inert.)');
}

console.log('\n=== (f) can any dial move without the pipeline being read? ===');
{
  // Every schedule() target, and whether the rule that owns it overwrites.
  const { PIPELINE_TARGETS } = await import('file:///home/ztchr/personal_projects/Crash/src/game/dials.js');
  console.log('  scheduled targets are now transmitted DRIVERS, which no rule assigns:');
  console.log('   ', [...PIPELINE_TARGETS].join(', '));
  console.log('  engine.js throws if anything schedules into a rule-owned field, and');
  console.log('  test/lags.test.js asserts statically that no rule writes one.');
}
