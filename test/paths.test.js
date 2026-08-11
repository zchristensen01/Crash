/**
 * POLICY PATHS, NOT HELD MOVES.
 *
 * `docs/11` §7 ends by calling this "the single biggest hole in this document":
 * every number ever measured in this project is a PERMANENT held move from a
 * settled state, and real policy is a path. The game is made of paths — hike,
 * hold, regret, cut — and none of that sequencing had ever been tested.
 *
 * The round trip is the load-bearing one. `investment.js` claims that scaling
 * the STANCE rather than the INCREMENT is what stops a cut-then-hike leaving
 * the economy permanently tighter, and that claim was never checked beyond a
 * single 24-month case. It is correct, and it is now locked in.
 *
 * What the round trip also shows is that the ECONOMY does not return even when
 * the stance does, and the last test here settles what that residue is.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { P } from '../src/params.js';
import { world, advance, dial, nudge } from './harness.mjs';

/** Two identical worlds; one walks a policy path. Returns the difference path. */
function path({ moves, months = 120, settle = 36, ...opts }) {
  const base = world({ assert: false, ...opts });
  const hit = world({ assert: false, ...opts });
  advance(base, settle); advance(hit, settle);
  const h = [];
  for (let m = 1; m <= months; m++) {
    if (moves[m]) moves[m](hit);
    advance(base, 1); advance(hit, 1);
    h.push({
      m,
      stance: hit.s.policy_rate_demand - base.s.policy_rate_demand,
      gap: hit.s.output_gap - base.s.output_gap,
      u: hit.s.unemployment - base.s.unemployment,
      inflation: hit.s.inflation - base.s.inflation,
      creditGap: hit.s.credit_to_gdp_gap - base.s.credit_to_gdp_gap,
      assets: hit.s.asset_prices - base.s.asset_prices,
      capital: hit.s.capital_stock - base.s.capital_stock,
      potential: hit.s.potential_output - base.s.potential_output,
    });
  }
  return { h, at: (m) => h[m - 1], base, hit };
}

test('ROUND TRIP: the stance returns exactly, to nine decimal places', () => {
  // investment.js's claim, checked properly for the first time. Scaling the
  // STANCE and not the INCREMENT is the whole reason this holds: an
  // increment-scaled model would come back 0.33pp tighter than it started,
  // forever, because a cut transmits at 1/MONETARY_ASYMMETRY_RATIO and the
  // hike that reverses it does not.
  const r = path({ moves: { 1: (w) => nudge(w, 'policy_rate', -1),
                            7: (w) => nudge(w, 'policy_rate', +1) }, months: 120 });
  assert.ok(Math.abs(r.at(120).stance) < 1e-9,
    `the transmitted stance came back to ${r.at(120).stance.toExponential(3)} rather ` +
    `than zero after a 1pp cut restored six months later`);
  assert.ok(Math.abs(r.at(60).stance) < 1e-9, 'and it was already back at five years');
});

test('ROUND TRIP: the ECONOMY does not return, and the residue is real capital', {
}, () => {
  // The open question docs/11 raised and never answered: after the stance has
  // returned exactly, output, inflation, the credit gap and asset prices are
  // all still up. Genuine hysteresis, or slow decay that never completes?
  //
  // MEASURED TO 240 MONTHS: it is hysteresis, and it is the correct kind.
  // Six months of cheap money got capital built, capital is a stock, and a
  // stock that has been built does not un-build when the rate goes back. The
  // capital stock and potential output are BOTH permanently higher, and the
  // output gap — the thing that would signal a policy error — decays toward
  // zero while they do not.
  const r = path({ moves: { 1: (w) => nudge(w, 'policy_rate', -1),
                            7: (w) => nudge(w, 'policy_rate', +1) }, months: 240 });

  assert.ok(r.at(240).capital > 0.05,
    `the capital stock is ${r.at(240).capital.toFixed(4)} higher at twenty years — ` +
    `if this decays to zero the residue was not hysteresis`);
  assert.ok(r.at(240).potential > 0,
    `potential output ended ${r.at(240).potential.toFixed(4)} higher, which is what ` +
    `a permanently larger capital stock means`);
  // The gap is the cyclical part, and it must decay.
  assert.ok(Math.abs(r.at(240).gap) < Math.abs(r.at(60).gap),
    `the output GAP is ${r.at(240).gap.toFixed(4)} at twenty years against ` +
    `${r.at(60).gap.toFixed(4)} at five — the cyclical residue has to be decaying ` +
    `even though the capital does not`);
  assert.ok(Math.abs(r.at(240).gap) < 0.5,
    `the output gap is still ${r.at(240).gap.toFixed(4)} after twenty years. That is ` +
    `too large to be capital; something is failing to close.`);
});

test('HIKE-HOLD-CUT: no permanent ratchet, and the jobs cost outlasts the gain', () => {
  // The sequence the game is actually made of. Two claims: the stance comes
  // back (as above, in the other direction), and the asymmetry between firing
  // and hiring means the labour-market cost is not symmetric with the benefit.
  const r = path({ moves: { 1: (w) => nudge(w, 'policy_rate', +2),
                            13: (w) => nudge(w, 'policy_rate', -2) }, months: 120 });
  assert.ok(Math.abs(r.at(120).stance) < 1e-9,
    `the stance ratcheted to ${r.at(120).stance.toExponential(3)}`);

  // Cumulative unemployment: point-months above baseline, against point-months
  // below it once the cut has landed. FIRING_SPEED is 2.4x HIRING_SPEED, so
  // the hole is dug fast and filled slowly.
  const cost = r.h.reduce((a, x) => a + Math.max(0, x.u), 0);
  const gain = r.h.reduce((a, x) => a + Math.max(0, -x.u), 0);
  assert.ok(cost > gain,
    `a +2pp hike held a year and then fully reversed cost ${cost.toFixed(2)} ` +
    `point-months of unemployment and returned ${gain.toFixed(2)}. Firing is ` +
    `${(P.FIRING_SPEED.value / P.HIRING_SPEED.value).toFixed(1)}x faster than hiring, ` +
    `so the round trip cannot be free.`);
  assert.ok(r.h.some((x) => x.u > 0.05), 'the hike has to cost visible jobs at all');
});

test('STOP-GO: a symmetric-looking cycle is a persistent EASING, and it shows', () => {
  // Eight years of -1pp then +1pp on a twelve-month cycle, four times.
  //
  // THE TRAP THIS TEST WALKED INTO FIRST, because it is the same trap the game
  // sets for the player: the MOVES sum to zero, so it looks like a policy that
  // nets out. It is not. The DIAL spends months 1-12 a point below baseline,
  // months 13-24 at baseline, and so on — an average stance of -0.5pp held for
  // eight years. Reading "the increments cancel" as "the level cancels" is a
  // real mistake about real policy and the model is right to punish it.
  //
  // MEASURED ON THE AVERAGE, NOT ON MONTH 96, since the A1 split. This used to
  // read the transmitted stance AT month 96 and require about -0.5; it got
  // -0.407, and that number was an artefact. policy_rate_demand rode a kernel
  // with a 14.74-month mean lag, so at any instant it carried a year and a bit
  // of history and looked like an average. With pass-through on its own fast
  // kernel the instantaneous reading at m96 is -0.000 — correctly, because the
  // dial went back to baseline in month 85 and borrowers are paying baseline.
  // The AVERAGE transmitted stance is now -0.500 against an average dial stance
  // of -0.500, where before it was -0.463: the fix made the claim in this
  // comment exactly true for the first time. The credit gap, which is what the
  // lesson is actually about, is +3.48 at m96 and +1.99 by m216 once the
  // pipeline has drained. (It read 5.17 here until Phase 5 re-measured it;
  // 5.2's private-debt maturity and 5.4's slower credit trend both moved it,
  // and the assertion below is a THRESHOLD rather than a value for exactly
  // that reason.)
  const moves = {};
  for (let m = 1; m <= 96; m += 24) {
    moves[m] = (w) => nudge(w, 'policy_rate', -1);
    moves[m + 12] = (w) => nudge(w, 'policy_rate', +1);
  }
  // 96 months of policy, then 120 months of nothing so the pipeline can DRAIN.
  const r = path({ moves, months: 216 });

  const avgStance = r.h.slice(0, 96).reduce((a, x) => a + x.stance, 0) / 96;
  assert.ok(avgStance < -0.3 && avgStance > -0.6,
    `the AVERAGE transmitted stance through the cycle is ${avgStance.toFixed(3)}; a ` +
    `dial spending half its time 1pp below baseline has to transmit to about -0.5`);

  // The credit gap opens IN PROPORTION to that easing rather than to the moves.
  // docs/11 measures +3.8pp of credit gap from a 1pp cut held four years; half
  // a point held eight years landing near +5 is the same coefficient.
  assert.ok(r.at(96).creditGap > 3,
    `eight years of an average half-point easing opened the credit gap only ` +
    `${r.at(96).creditGap.toFixed(2)}pp. Cheap money held for a term is how the ` +
    `bubble happens to you by accident, and it has to be visible.`);

  // AND IT UNWINDS once policy stops. That is what distinguishes a response
  // from a numerical artefact: the credit gap peaks after the last move and
  // then closes as the trend catches up with the stock.
  const peak = Math.max(...r.h.map((x) => x.creditGap));
  assert.ok(r.at(216).creditGap < peak * 0.85,
    `the credit gap peaked at ${peak.toFixed(3)} and is still ` +
    `${r.at(216).creditGap.toFixed(3)} ten years after the last move — it has to ` +
    `unwind with the stance that opened it, or no term explains it`);
  assert.ok(Math.abs(r.at(216).stance) < 1e-9,
    `the stance is ${r.at(216).stance.toExponential(3)} ten years after the last move`);
  assert.ok(r.h.every((x) => Number.isFinite(x.creditGap) && Math.abs(x.creditGap) < 25),
    'the credit gap went non-finite or absurd somewhere on the path');
});

test('a path and a held move are not the same thing, and the difference is measurable', () => {
  // The reason this file exists. Every published number in docs/11 is a held
  // move; this checks that the distinction is real rather than pedantic.
  const held = path({ moves: { 1: (w) => nudge(w, 'policy_rate', -1) }, months: 48 });
  const roundTrip = path({ moves: { 1: (w) => nudge(w, 'policy_rate', -1),
                                    7: (w) => nudge(w, 'policy_rate', +1) }, months: 48 });
  assert.ok(Math.abs(roundTrip.at(48).gap) < Math.abs(held.at(48).gap) * 0.5,
    `a 1pp cut held for four years moved the gap ${held.at(48).gap.toFixed(3)} and the ` +
    `same cut reversed after six months moved it ${roundTrip.at(48).gap.toFixed(3)} — ` +
    `if those are close, the model is not distinguishing a path from a level`);
});
