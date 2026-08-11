/**
 * IMPULSE RESPONSE SHAPES.
 *
 * docs/10 listed "no impulse-response shapes" as the third-largest validation
 * gap: published VAR IRFs give a whole curve and the suite checked one point on
 * it. docs/07 M9 tried, found no response had a peak, and closed the finding —
 * but it was measuring PERMANENT held moves, which cannot peak by construction.
 * A permanent change in the stance has a permanent effect.
 *
 * These use `irf()` in the harness: move the dial, hold it a year, put it back,
 * difference against an untouched baseline. That is what a VAR impulse response
 * IS, and it is the only experiment in this project that can produce a
 * months-to-peak number.
 *
 * WHAT THE BRACKETS IN docs/02 PART 5 ACTUALLY ARE. LAGS_MONTHS carries
 * `rate_to_output: 12` and `rate_to_unemployment: 18`, and neither is wired to
 * anything — they are REDUCED FORMS, the observed peak of a whole economy's
 * response. The model builds its output response by convolving the one
 * STRUCTURAL lag it has (`rate_to_investment`, peak 9) with the multiplier, the
 * accelerator and the capital stock, and derives a peak of 17. Imposing 12 on
 * top of that would be feeding an observation in as a structural input — the
 * same error as CRISIS_OUTPUT_TROUGH, and this project's rule 4. So the
 * assertions below are about SHAPE, and the measured months are documented in
 * docs/11 rather than asserted to equal the brackets.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { P } from '../src/params.js';
import { irf, world, advance, dial, nudge } from './harness.mjs';

const rateImpulse = (pp, o = {}) => irf({
  shock: (w) => nudge(w, 'policy_rate', pp),
  unshock: (w) => nudge(w, 'policy_rate', -pp),
  ...o,
});

test('a temporary rate hike produces a HUMP, not a ramp', () => {
  // The thing docs/07 M9 could not find, because it was looking at permanent
  // moves. Every series must rise, turn over, and come back.
  const r = rateImpulse(+1);
  for (const k of ['output_gap', 'unemployment', 'inflation']) {
    const pk = r.peak(k);
    assert.ok(pk.m > 3 && pk.m < 40,
      `${k} peaked at month ${pk.m} — an impulse response that peaks at the very ` +
      `start or the very end is not a hump`);
    const end = r.path[r.path.length - 1][k];
    assert.ok(Math.abs(end) < Math.abs(pk.v) * 0.8,
      `${k} is still at ${end.toFixed(3)} at month 48 against a peak of ` +
      `${pk.v.toFixed(3)} — a TEMPORARY move has to unwind`);
  }
});

/**
 * THE SEPARATION IS MEASURED ON THE MEDIAN, NOT THE ARGMAX, and the reason is
 * a measurement problem rather than a modelling one.
 *
 * The inflation impulse response is a broad, almost flat plateau: its argmax
 * sits at month 17 while half its cumulative response has still not arrived by
 * month 42. On a curve that flat the argmax is not a statistic — a 3% change
 * anywhere along it moves the reported peak by six months. Measured across the
 * A1 transmission split, which changed the front end of every response:
 *
 *              argmax gap   centroid gap   median gap
 *   before          6           3.4            5
 *   after           2           3.2            5
 *
 * The lesson is intact and the argmax is noise. So the ordering is still
 * asserted on the peaks — that is a claim about sequence, and it holds — while
 * the SIZE of the separation is asserted on the month by which half the
 * response has arrived, which is stable.
 */
function medianMonth(r, k) {
  const a = r.path.map((x) => Math.abs(x[k]));
  const total = a.reduce((s, v) => s + v, 0);
  let c = 0;
  for (let i = 0; i < a.length; i++) { c += a[i]; if (c >= total / 2) return i + 1; }
  return a.length;
}

test('the ordering of the peaks is output, then unemployment, then inflation', () => {
  // docs/02 Part 5's real claim, underneath the bracket numbers: the real
  // economy moves before the labour market, which moves before prices. The
  // ordering is the lesson; the exact months are derived, not imposed.
  const r = rateImpulse(+1, { months: 96 });
  const y = r.peak('output_gap').m, u = r.peak('unemployment').m, pi = r.peak('inflation').m;
  assert.ok(u >= y, `unemployment peaked at ${u}, before output at ${y}`);
  assert.ok(pi > u, `inflation peaked at ${pi}, not after unemployment at ${u}`);

  const my = medianMonth(r, 'output_gap'), mpi = medianMonth(r, 'inflation');
  assert.ok(mpi - my >= 3,
    `only ${mpi - my} months between output delivering half its response (m${my}) ` +
    `and inflation delivering half of its (m${mpi}) — "it takes a year to move ` +
    `output and two to move inflation" is the game's central frustration and it ` +
    `has to be visible`);
});

test('the response scales with the size of the impulse and not with its sign', () => {
  // Cheap, and it would have caught the ELB step in docs/12 L3 immediately:
  // a step function makes the response per pp jump between impulse sizes.
  const half = rateImpulse(+0.5).peak('output_gap');
  const one = rateImpulse(+1.0).peak('output_gap');
  const two = rateImpulse(+2.0).peak('output_gap');
  assert.ok(Math.abs(one.v) > Math.abs(half.v) && Math.abs(two.v) > Math.abs(one.v),
    'a bigger hike must move output further');
  const perPp = [half.v / 0.5, one.v / 1, two.v / 2];
  for (let i = 1; i < perPp.length; i++) {
    assert.ok(Math.abs(perPp[i] / perPp[i - 1] - 1) < 0.35,
      `the response per pp changes by more than a third between impulse sizes ` +
      `(${perPp.map((x) => x.toFixed(3)).join(', ')}) — that is a switch, not a curve`);
  }
});

test('a cut is a weaker impulse than a hike, for as long as the impulse is live', () => {
  // The existing transmission test checks this on impact only. Along the path
  // the ratio starts at exactly 1/MONETARY_ASYMMETRY_RATIO and drifts up as the
  // capital stock responds: 0.667 at month 1, 0.838 at 12, 0.842 at 13.
  //
  // IT THEN INVERTS, and that is a real result rather than a failure of this
  // test: 0.951 at month 24, 1.205 at 36, 1.497 at 48. Once the impulse has
  // been reversed, the CUT leaves more behind than the hike does, because a cut
  // builds capital and a hike merely fails to. That residue is measured
  // properly in test/paths.test.js, which is where the round-trip question
  // belongs. Tenreyro & Thwaites is a claim about the response to a live
  // stance, so that is what is asserted here.
  const up = rateImpulse(+1).path;
  const down = rateImpulse(-1).path;
  for (const m of [1, 3, 6, 9, 12, 13]) {
    const h = Math.abs(up[m - 1].output_gap), c = Math.abs(down[m - 1].output_gap);
    assert.ok(c < h,
      `at month ${m} a cut moved output ${c.toFixed(4)} and a hike ${h.toFixed(4)} — ` +
      `pushing a string has to be weaker than pulling a rope`);
  }
  const ratio1 = Math.abs(down[0].output_gap / up[0].output_gap);
  assert.ok(Math.abs(ratio1 - 1 / P.MONETARY_ASYMMETRY_RATIO.value) < 0.03,
    `on impact the ratio is ${ratio1.toFixed(3)}, and it must be ` +
    `1/MONETARY_ASYMMETRY_RATIO = ${(1 / P.MONETARY_ASYMMETRY_RATIO.value).toFixed(3)}`);
});

test('MEASURED: the labour market has no lag behind output, and here it is', {
  todo: 'OPEN AND DELIBERATELY NOT CLOSED. Unemployment peaks in the SAME month ' +
    'as output, and a -3pp external demand shock puts 38% of the ' +
    'eventual 36-month unemployment response into month ONE (du 0.4725 of ' +
    '1.2456; 48% of the 12-month response). labour.js sets its Okun target from the ' +
    'CURRENT gap and closes it at FIRING_SPEED 0.60/month. Whether that is ' +
    'wrong depends on which claim you read: docs/02 Asymmetry 2 says "firms ' +
    'fire in WEEKS and hire over quarters", which the model delivers exactly ' +
    '— and the jobless-recovery half of it is real (du/dgap doubles from 0.198 ' +
    'to 0.391 over four years as output recovers and employment does not). ' +
    'What is missing is the DECISION lag: firms cut hours and wait a quarter ' +
    'before shedding heads. Adding it means a new smoothing parameter on the ' +
    'Okun target in the busiest rule in the model, and the only thing that ' +
    'pins its magnitude is the reduced-form peak month it would be tuned to ' +
    'reproduce. Left open, with the number printed, rather than tuned.',
}, () => {
  const base = world({ assert: false });
  const hit = world({ assert: false });
  advance(base, 36); advance(hit, 36);
  hit.nx = -3;
  advance(base, 1); advance(hit, 1);
  const du1 = hit.s.unemployment - base.s.unemployment;
  for (let m = 2; m <= 36; m++) { advance(base, 1); advance(hit, 1); }
  const duEnd = hit.s.unemployment - base.s.unemployment;
  const share = du1 / duEnd;
  assert.ok(share < 0.15,
    `${(share * 100).toFixed(0)}% of the eventual unemployment response to a demand ` +
    `shock lands in the FIRST MONTH (${du1.toFixed(4)} of ${duEnd.toFixed(4)}). ` +
    `Firms do not shed a third of the eventual job losses in month one.`);
});

test('the spending impulse is fast and the rate impulse is slow', () => {
  // docs/11 §1's central claim, restated as a shape rather than a share:
  // purchases ARE demand, so there is nothing to transmit.
  const spend = irf({
    shock: (w) => nudge(w, 'govt_spending', +1),
    unshock: (w) => nudge(w, 'govt_spending', -1),
  });
  const rate = rateImpulse(-1);
  const firstQuarter = (r) => Math.abs(r.path[2].output_gap) / Math.abs(r.peak('output_gap').v);
  assert.ok(firstQuarter(spend) > 0.5,
    `spending delivered only ${(firstQuarter(spend) * 100).toFixed(0)}% of its peak ` +
    `by month 3 — government purchases are demand and land at once`);
  assert.ok(firstQuarter(rate) < 0.2,
    `the rate delivered ${(firstQuarter(rate) * 100).toFixed(0)}% of its peak by ` +
    `month 3 — everything that works through a price is slow`);
});

test('QE and the rate dial have the same SHAPE and different sizes', () => {
  // If they did not, one of the two lag kernels would be wrong.
  const qe = irf({ shock: (w) => dial(w, 'qe', 10), unshock: (w) => dial(w, 'qe', 0) });
  const rate = rateImpulse(-1);
  const qm = qe.peak('output_gap').m, rm = rate.peak('output_gap').m;
  assert.ok(Math.abs(qm - rm) <= 6,
    `QE peaks at month ${qm} and the rate at ${rm} — both work through the cost ` +
    `of capital, so their shapes should be close`);
  assert.ok(Math.abs(qe.peak('output_gap').v) < Math.abs(rate.peak('output_gap').v),
    `10% of GDP of QE moved output further than 1pp of rate, against ` +
    `QE_TO_YIELD = ${P.QE_TO_YIELD.value}bp per 1% of GDP`);
});
