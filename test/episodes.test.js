/**
 * HISTORICAL EPISODES — the only test in this project that can say the model
 * is WRONG rather than merely self-consistent.
 *
 * `docs/10` calls this "the highest-value thing left, and nothing else
 * substitutes for it", and `parameters.py` UNKNOWNS['validation_target_paths']
 * says out loud that the research passes supplied starting vectors and no
 * target PATHS. Every other test here shocks the model once and checks a
 * number. These feed it the ACTUAL policy path of a real episode and ask
 * whether the arc comes out the right shape.
 *
 * ============================ READ THIS FIRST ============================
 * THE MODEL STILL FAILS ALL FOUR — but it no longer fails them all the SAME
 * way, and that is the result of the fourth audit's Phase 2.
 *
 * `docs/12`'s headline was that the model does not disinflate gradually at
 * all: it either stabilised or diverged, with a two-percentage-point
 * knife-edge between them and nothing in the middle. THAT IS NOW CLOSED — see
 * the last test in this file, which used to be a failing `todo` and is now a
 * passing assertion. `docs/12` attributed it to a missing forward-looking
 * expectations channel; it was a transmission lag applied to the wrong
 * quantity, and fixing that removed it without touching expectations at all.
 *
 * WHAT THE FOUR NOW SAY, WHICH IS FOUR DIFFERENT THINGS:
 *   UK 1979-83   THE BIG WINNER. The disinflation now happens, and on roughly
 *                the historical timetable (peak month 11 vs the UK's 13,
 *                against month 60 before). It is still far too cheap:
 *                sacrifice ratio 0.38 against Ball's 2-4.
 *   US 2021-23   Materially better — inflation now peaks inside the window at
 *                all — and what remains is ENTIRELY the expectations block:
 *                credibility collapses to zero on realised misses alone.
 *   JAPAN        Untouched, and could not have been: Phase 2 moved the
 *                ceiling, and Japan spends a decade against the FLOOR. Points
 *                at the same expectations channel from the deflationary side.
 *   US 2008-12   Untouched, and the least like the others: it is a crash plus
 *                an EASING, so faster transmission helps the easing too. Sits
 *                downstream of Section B.
 *
 * Two of the four now point at the same missing mechanism — expectations that
 * respond to something other than realised inflation — and they point at it
 * from opposite directions. That agreement is new, and it is the most useful
 * thing this file currently says.
 *
 * Every disagreement below is a `todo` carrying its measured number, per the
 * standing rule: a model that lands outside the evidence is a finding to
 * surface, never a coefficient to move. NOTHING IN THIS FILE HAS BEEN TUNED.
 * =========================================================================
 *
 * THE RULES OF THIS FILE:
 *
 * 1. ASSERT AN ARC IN BANDS, NEVER A POINT. The model is a mid-size
 *    representative advanced economy with no exchange rate, no distribution
 *    and no balance sheets; it cannot BE the United States.
 * 2. FEED THE POLICY, NOT THE OUTCOME. Only dials move, and only through
 *    applyDialChange. Nothing here nudges inflation or unemployment toward a
 *    historical value — that would be drawing the answer on the test.
 * 3. THE STARTING VECTOR MAY ONLY SET STATE A SCENARIO IS ALLOWED TO SET, and
 *    the credit stock, its trend and the gap must be mutually consistent or
 *    updateCreditGap silently recomputes the gap to zero and the "stretched
 *    system" is not stretched. That mistake cost an hour; it is why
 *    private_credit, credit_trend and credit_to_gdp_gap are always set together.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { P } from '../src/params.js';
import { EVENTS } from '../src/game/events.js';
import { world, advance, dial, nudge } from './harness.mjs';

const CRASH = EVENTS.find((e) => e.key === 'financial_crisis');

/**
 * Run a policy path and record the whole history.
 * @param {object} o.start   newState overrides — the starting vector
 * @param {object} o.policy  month -> (world) => void, applied at the START of that month
 */
function episode({ start = {}, policy = {}, months = 60 }) {
  const w = world({ overrides: start, assert: false, events: false });
  const h = [];
  for (let m = 0; m < months; m++) {
    if (policy[m]) policy[m](w);
    advance(w, 1);
    h.push({ m: m + 1, ...w.s });
  }
  const pot0 = h[0].potential_output, g = h[0].potential_growth;
  return {
    h,
    at: (m) => h[m - 1],
    peak: (k) => h.reduce((a, b) => (b[k] > a[k] ? b : a)),
    trough: (k) => h.reduce((a, b) => (b[k] < a[k] ? b : a)),
    // Output against the pre-episode trend, the way a recession is reported.
    vsTrend: (m) => (h[m - 1].output / (pot0 * Math.pow(1 + g / 100, m / 12)) - 1) * 100,
    minVsTrend() { return Math.min(...h.map((_, i) => this.vsTrend(i + 1))); },
  };
}

/* =====================================================================
 * US 2008-12.  m0 = January 2008, Lehman at month 9.
 * Fed funds 2.0 -> 0.25 by month 11 and held; QE to ~12% of GDP by month 24
 * and ~18% by 36; ARRA and the discretionary pieces ~+2.0pp of purchases
 * across months 9-36. The starting vector is a stretched system: credit 16pp
 * above trend, houses 70% above fundamental, banks on 11% capital.
 * ===================================================================== */
function us2008() {
  return episode({
    months: 60,
    start: {
      policy_rate: 2.0, yield_10y: 3.8, inflation: 2.5, unemployment: 5.0,
      private_credit_gdp: 168, private_credit: 168, credit_trend: 152,
      credit_to_gdp_gap: 16.0, govt_debt: 64, credibility: 0.85,
      asset_prices: 170, asset_fundamental: 100,
      bank_capital_ratio: 11.0, credit_spread: 1.6, deficit: 5.43,
    },
    policy: {
      2: (w) => dial(w, 'policy_rate', 1.0),
      5: (w) => dial(w, 'policy_rate', 0.5),
      8: (w) => CRASH.apply(w.s),
      9: (w) => nudge(w, 'govt_spending', +2.0),
      11: (w) => dial(w, 'policy_rate', 0.25),
      13: (w) => dial(w, 'qe', 6),
      24: (w) => dial(w, 'qe', 12),
      36: (w) => { dial(w, 'qe', 18); nudge(w, 'govt_spending', -2.0); },
    },
  });
}

test('US 2008-12: the rate dial does reach its floor and stay there', () => {
  // What survives: the shape of the POLICY is right, and QE keeps working
  // after the rate dial stops. Both are the model behaving as designed.
  const r = us2008();
  assert.equal(r.at(12).policy_rate, 0.25, 'the funds rate should be at its floor by a year');
  assert.ok(r.at(60).qe === 18, 'QE should be at 18% of GDP by five years');
  assert.ok(r.at(60).qe_rate_relief > 0.3,
    `QE moved the long yield only ${r.at(60).qe_rate_relief.toFixed(3)}pp`);
});

test('US 2008-12: THE CRISIS IS ENTIRELY OFFSET BY THE RATE CUTS THAT FOLLOWED IT', {
  todo: 'STILL FAILS, AND PHASE 2 BARELY TOUCHED IT — which is itself the ' +
    'finding. Re-measured after the A1 transmission split and the derived rate ' +
    'ceiling: output troughs at -1.85% of trend (was -1.86; US: -5 to -7), ' +
    'unemployment rises +0.14pp peaking in month 9 (was +0.32pp; US: +5.0pp to ' +
    '10.0% at month 22), inflation never goes below 2.25% (was 2.26; US: -2.1%), ' +
    'and government debt FALLS from 64% to 61% (was 60; US: 64 -> 100). ' +
    'Output is +3.55% of trend at month 6, BEFORE Lehman lands. ' +
    'THE UNEMPLOYMENT RESPONSE GOT SMALLER, not larger. ' +
    'WHY PHASE 2 DID NOT HELP HERE, and it is worth understanding: this ' +
    'episode is not a disinflation, it is a CRASH plus an easing, and the two ' +
    'Section A defects were both about tightening arriving too slowly. Making ' +
    'the rate arrive faster makes the EASING arrive faster too, so the 1.75pp ' +
    'of cuts delivered between months 2 and 11 now offset the crisis sooner ' +
    'rather than less. The asymmetry the brief identified is unchanged: the ' +
    'cut reaches asset prices on a 1-month kernel and now reaches borrowers on ' +
    'a 3-month one, while the crisis works through the credit and capital ' +
    'blocks over years. What is left is a demand block that heals too fast, ' +
    'which is the same statement as OPEN #1 and TAX_SHOCK_TO_GDP, and it sits ' +
    'downstream of Section B rather than Section A. Re-measure after Phase 3.',
}, () => {
  const r = us2008();
  const uRise = r.peak('unemployment').unemployment - r.at(1).unemployment;
  assert.ok(uRise >= 3.5,
    `unemployment rose ${uRise.toFixed(2)}pp, peaking in month ${r.peak('unemployment').m}; ` +
    `the US went 5.0 to 10.0. Output trough ${r.minVsTrend().toFixed(2)}% of trend, ` +
    `inflation low ${r.trough('inflation').inflation.toFixed(2)}%, ` +
    `debt ${r.at(1).govt_debt.toFixed(0)} -> ${r.at(60).govt_debt.toFixed(0)}.`);
});

/* =====================================================================
 * US 2021-23.  m0 = January 2021.
 * ARP and the tail of CARES as TRANSFERS (~6pp of GDP, months 2-12) rather
 * than purchases, because that is what they were — stimulus cheques and
 * enhanced UI, which reach demand through the MPC and not directly. A supply
 * shock at month 14. Funds rate 0.25 -> 5.25 across months 14-27.
 * ===================================================================== */
function us2021() {
  return episode({
    months: 40,
    start: {
      policy_rate: 0.25, yield_10y: 1.1, inflation: 1.4, unemployment: 6.3,
      govt_debt: 100, credibility: 0.85, natural_unemployment: 4.5, deficit: 5.85,
    },
    policy: {
      2: (w) => { w.s.transfers_base += 6; },
      12: (w) => { w.s.transfers_base -= 6; },
      14: (w) => { w.s.supply_shock += 3.5; dial(w, 'policy_rate', 0.5); },
      16: (w) => dial(w, 'policy_rate', 1.75),
      18: (w) => dial(w, 'policy_rate', 3.25),
      21: (w) => dial(w, 'policy_rate', 4.5),
      27: (w) => dial(w, 'policy_rate', 5.25),
    },
  });
}

test('US 2021-23: fiscal transfers plus a supply shock do produce an inflation', () => {
  const r = us2021();
  assert.ok(r.peak('inflation').inflation > 7,
    `inflation peaked at ${r.peak('inflation').inflation.toFixed(2)}%; US CPI hit 9.1%`);
  assert.ok(r.at(18).inflation > 5,
    `inflation was ${r.at(18).inflation.toFixed(2)}% in month 18, when US CPI peaked at 9.1%`);
});

test('US 2021-23: THE DISINFLATION NEVER HAPPENS', {
  todo: 'MATERIALLY BETTER AFTER PHASE 2 AND STILL WRONG. Inflation now PEAKS ' +
    'inside the window — 20.54% at month 40, where before it had not peaked at ' +
    'all and was still climbing through 36.81% — and it is 10.41% at month 32 ' +
    'against 14.06% before (US: peaked 9.1% at month 17, 3.1% by month 32). ' +
    'The single biggest change is that the hike now reaches the economy: ' +
    'mechanism (1) in the old diagnosis was that the transmitted rate was ' +
    '2.28% at month 30 while the DIAL had been at 5.25 since month 27, and ' +
    'that is gone — policy_rate_demand now tracks the dial within a quarter. ' +
    'WHAT IS LEFT IS MECHANISM (2), AND IT IS NOW THE WHOLE OF IT: credibility ' +
    'falls 0.85 -> 0.000 by month 31 purely from realised misses, which ' +
    'quadruples kappa and makes the process self-reinforcing exactly when the ' +
    'central bank most needs to be believed. A 5.25% funds rate against 20% ' +
    'expected inflation is deeply negative in real terms whatever the ' +
    'transmission speed. This is the forward-guidance / expectations channel ' +
    'the project has deferred three times, and after Phase 2 it is the ' +
    'largest single thing still missing from the monetary block — the ' +
    'reasoning in docs/12 that deferred it named the wrong defect, but Phase 2 ' +
    'has now removed that defect and the case for building it is what remains. ' +
    'Do not raise the transmission speed or lower kappa to close this.',
}, () => {
  const r = us2021();
  const pk = r.peak('inflation');
  assert.ok(pk.m <= 22 && r.at(32).inflation < 4,
    `inflation peaked at ${pk.inflation.toFixed(2)}% in month ${pk.m} and was ` +
    `${r.at(32).inflation.toFixed(2)}% at month 32; the US peaked at 9.1% in month 18 ` +
    `and was at 3.1% by month 32. Credibility bottomed at ` +
    `${r.trough('credibility').credibility.toFixed(3)} in month ${r.trough('credibility').m}.`);
});

/* =====================================================================
 * UK 1979-83.  m0 = May 1979.
 * MLR 12 -> 17 at month 6, -> 12 by month 22, -> 9 by month 36. VAT 8% -> 15%
 * in the June 1979 budget, ~+2.5pp of GDP, at month 4. Credibility starts at
 * 0.35 — a decade of failed incomes policies, and the reason it was expensive.
 * ===================================================================== */
function uk1979() {
  return episode({
    months: 60,
    start: {
      policy_rate: 12.0, yield_10y: 12.5, inflation: 10.3, expected_inflation: 11.0,
      unemployment: 5.4, natural_unemployment: 6.0, credibility: 0.35,
      govt_debt: 45, potential_growth: 1.5, supply_shock: 3.0, deficit: 5.25,
    },
    policy: {
      4: (w) => nudge(w, 'tax_rate', +2.5),
      6: (w) => dial(w, 'policy_rate', 17.0),
      22: (w) => dial(w, 'policy_rate', 12.0),
      36: (w) => dial(w, 'policy_rate', 9.0),
    },
  });
}

test('UK 1979-83: low credibility really does make inflation more expensive', () => {
  // What survives, and it is the mechanism docs/02 cares most about: starting
  // with credibility at 0.35 puts kappa on its unanchored branch within six
  // months and keeps it there, which is the whole reason the episode was hard.
  const r = uk1979();
  assert.ok(r.at(6).kappa_effective > P.PHILLIPS_KAPPA_ANCHORED.value * 3,
    `kappa was ${r.at(6).kappa_effective.toFixed(3)} at six months; with credibility ` +
    `this low it has to be on the unanchored branch`);
  assert.ok(r.at(6).inflation > r.at(1).inflation,
    'inflation should still be rising six months in, while the hike transmits');
  // The PEAK LEVEL assertion that used to sit here has moved into the episode's
  // magnitude test below, where the rest of its disagreements with history
  // already live. The A1 split took the peak from 20.39% to 16.38% against a UK
  // RPI of 21.9% — the hike now reaches borrowers, so inflation turns over
  // sooner and lower. That is a magnitude, not a mechanism, and this test is
  // the mechanism one: kappa on its unanchored branch is what made the episode
  // hard, and that is unchanged.
});

test('UK 1979-83: THE RECESSION THAT PAID FOR IT NEVER ARRIVES', {
  todo: 'THE BIGGEST IMPROVEMENT OF PHASE 2, AND IT STILL FAILS ON THE PRICE. ' +
    'The TIMING is now right: inflation peaks in month 11 where the UK peaked ' +
    'in month 13, against month 60 before the A1 split — the disinflation now ' +
    'happens, and on roughly the historical timetable. It falls to 8.63% at ' +
    'four years, against 13.71% before (UK: 4.6%). The felt rate at month 12 ' +
    'went from 13.12% to 16.86% against a 17% MLR, which is the whole of why: ' +
    'Howe\'s budget is now actually contractionary in the model rather than ' +
    'nominally so. ' +
    'WHAT STILL FAILS IS THE PRICE, AND IT FAILS IN BOTH DIRECTIONS. The peak ' +
    'is 16.38% against a UK 21.9% — the model no longer overshoots into a late ' +
    'spiral, but it never reaches the historical peak either. And the recession ' +
    'is still absent: unemployment rises 0.64pp where the UK went 5.4 -> 11.9, ' +
    'so the sacrifice ratio is 0.38 point-years per pp against Ball 1994\'s 2-4 ' +
    'for this exact episode. A disinflation this cheap is not a disinflation ' +
    'anyone would recognise. That is a statement about the DEMAND BLOCK — the ' +
    'same finding as TAX_SHOCK_TO_GDP and the missing austerity paradox, where ' +
    'every real quantity moves too little for the price change that caused it. ' +
    'It is no longer a statement about transmission.',
}, () => {
  const r = uk1979();
  const pk = r.peak('inflation');
  const uRise = r.peak('unemployment').unemployment - r.at(1).unemployment;
  const excessU = r.h.slice(0, 48)
    .reduce((a, x) => a + Math.max(0, x.unemployment - x.natural_unemployment), 0) / 12;
  const ratio = excessU / (pk.inflation - r.at(48).inflation);
  // `pk.inflation > 18` moved here from the mechanism test above when the A1
  // split took the peak below it. UK RPI peaked at 21.9%.
  assert.ok(pk.m <= 20 && pk.inflation > 18
            && r.at(48).inflation < pk.inflation / 2 && uRise >= 5,
    `inflation peaked in month ${pk.m} at ${pk.inflation.toFixed(2)}% (UK: 21.9%) ` +
    `and was ${r.at(48).inflation.toFixed(2)}% at four years; unemployment rose ` +
    `${uRise.toFixed(2)}pp; sacrifice ratio ${ratio.toFixed(2)} against Ball's 2-4.`);
});

/* =====================================================================
 * JAPAN 1995-2005.  m0 = January 1995.
 * Call rate 0.5 -> 0 at month 18; QE from month 72 to ~25% of GDP.
 * THE POINT OF THIS ONE is BOND_YIELD_FOREIGN_MULTIPLIER, which exists solely
 * to tell Japan from the euro periphery and which NOTHING TESTED before this.
 * ===================================================================== */
function japan() {
  return episode({
    months: 120,
    start: {
      policy_rate: 0.5, yield_10y: 2.5, inflation: 0.1, expected_inflation: 0.3,
      unemployment: 3.2, natural_unemployment: 3.5, govt_debt: 90,
      foreign_share: 0.07, potential_growth: 1.0, credibility: 0.7,
      private_credit_gdp: 190, private_credit: 190, credit_trend: 194,
      credit_to_gdp_gap: -4, bank_capital_ratio: 9.5, deficit: 4.65,
    },
    policy: {
      18: (w) => dial(w, 'policy_rate', 0.0),
      72: (w) => dial(w, 'qe', 10),
      84: (w) => dial(w, 'qe', 18),
      96: (w) => dial(w, 'qe', 25),
    },
  });
}

test('JAPAN: own-currency debt held at home does not reprice, and foreign-held does', () => {
  // BOND_YIELD_FOREIGN_MULTIPLIER's only test anywhere. It is the reason the
  // model can teach that high debt is neither always fine nor always fatal.
  const domestic = japan();
  assert.ok(domestic.peak('yield_10y').yield_10y < 2.0,
    `the 10-year yield reached ${domestic.peak('yield_10y').yield_10y.toFixed(2)}% with ` +
    `only 7% of the debt held abroad`);

  // The same debt, held abroad, at the level where the nonlinearity bites.
  const at = (share) => {
    const r = episode({
      months: 48,
      start: { policy_rate: 0.5, yield_10y: 2.5, inflation: 0.1, unemployment: 3.2,
               govt_debt: 140, foreign_share: share, potential_growth: 1.0,
               deficit: 4.65 },
      policy: {},
    });
    return r.at(1).yield_10y;
  };
  assert.ok(at(0.75) > at(0.07) + 1.5,
    `at 140% of GDP the yield is ${at(0.07).toFixed(2)}% with 7% held abroad and ` +
    `${at(0.75).toFixed(2)}% with 75% — the ownership switch is not doing anything, ` +
    `and it is the entire reason BOND_YIELD_FOREIGN_MULTIPLIER exists`);
});

test('JAPAN: THE MODEL CANNOT HOLD A DEFLATION', {
  todo: 'UNCHANGED BY PHASE 2, AS EXPECTED, AND THE REASON MATTERS. Inflation ' +
    'is under 0.5% in 2 of 120 months; it leaves the deflation inside a year ' +
    '(1.28% at month 12, was 1.44%), passes target by month 36 (2.78%) and ' +
    'reaches 3.76% by month 60 (was 3.95%) with the policy rate on the floor ' +
    'throughout. Debt peaks at 91% where Japan passed 150%, because the ' +
    'inflation the model invents erodes it. ' +
    'PHASE 2 COULD NOT HAVE HELPED. Both Section A defects were about a ' +
    'TIGHTENING arriving too slowly, and Japan is a decade in which no ' +
    'tightening was attempted and the rate dial was against its LOWER bound ' +
    'the whole time — the one bound Phase 2.4 did not move, because the ELB is ' +
    'physics rather than layout. ' +
    'THE MISSING MECHANISM IS DOWNWARD DE-ANCHORING: updateExpectations pulls ' +
    'expectations back toward inflation_target from BELOW at the same rate as ' +
    'from above, so a central bank with credibility 0.7 that cannot reach 2% is ' +
    'not representable. Japan\'s problem was precisely that nobody believed the ' +
    'BoJ could get there. That is the same expectations channel US 2021-23 now ' +
    'points at, seen from the deflationary side, and after Phase 2 the two ' +
    'episodes agree on the diagnosis for the first time.',
}, () => {
  const r = japan();
  const belowHalf = r.h.filter((x) => x.inflation < 0.5).length;
  assert.ok(belowHalf >= 60 && r.peak('govt_debt').govt_debt > 150,
    `inflation was under 0.5% in ${belowHalf} of 120 months and debt peaked at ` +
    `${r.peak('govt_debt').govt_debt.toFixed(0)}%. Japan: most of the decade, and ` +
    `past 150%. Model inflation at m12/m36/m60: ${r.at(12).inflation.toFixed(2)} / ` +
    `${r.at(36).inflation.toFixed(2)} / ${r.at(60).inflation.toFixed(2)}.`);
});

/* ===================================================================== */

test('the Taylor principle IS satisfiable — but only by jumping, never by walking', () => {
  // The good news, and the boundary condition for the finding below. A central
  // bank that takes the nominal rate decisively above inflation IN ONE MOVE
  // does disinflate, and it pays the expected price in jobs.
  const r = episode({
    months: 60,
    start: { inflation: 8.0, expected_inflation: 7.0, credibility: 0.6,
             unemployment: 4.0, policy_rate: 2.5, yield_10y: 3.25 },
    policy: { 0: (w) => dial(w, 'policy_rate', 15.0) },
  });
  assert.ok(r.at(36).inflation < 4.0,
    `a policy rate held at 15% against 8% inflation left inflation at ` +
    `${r.at(36).inflation.toFixed(2)}% after three years`);
  // THE RISE, NOT THE LEVEL. "It has to cost jobs" is a statement about how
  // far unemployment moves, and tying it to a level silently ties it to the
  // starting point too. Measured: 4.00% -> 7.89%, a +3.89pp rise, against
  // +4.4pp before the 3.1 asset-price fix removed a 4.6x amplifier from the
  // wealth channel. The lesson is unchanged and slightly cheaper.
  const uRise = r.peak('unemployment').unemployment - 4.0;
  assert.ok(uRise > 3.0,
    `and it has to cost jobs: unemployment peaked at ` +
    `${r.peak('unemployment').unemployment.toFixed(2)}%, a rise of only ` +
    `${uRise.toFixed(2)}pp. Taking inflation from 8% to under 1% in three years ` +
    `without a multi-point rise in unemployment is not a disinflation anyone ` +
    `would recognise.`);
});

/**
 * THE ONE FINDING UNDERNEATH ALL FOUR — CLOSED BY PHASE 2.
 *
 * This was the largest finding in `docs/12`: the model did not disinflate
 * GRADUALLY at all. It either stabilised or diverged, with a knife-edge
 * between them and nothing in the middle, and real economies live in the
 * middle. Measured then, from 8% inflation and 7% expected, rate moved in ONE
 * step, inflation at month 36:
 *
 *      to 7%  ->  217.6%          to 9%  ->  0.69%
 *
 * Two percentage points of policy separated hyperinflation from success. And
 * the SAME destination reached gradually flipped the outcome: 15% immediately
 * gave 2.16% deflation, 15% over 24 months gave 250%.
 *
 * MEASURED NOW, after Phase 2, the same experiments:
 *
 *      one step to   6%    6.5%     7%    7.5%     8%     9%    12%    15%
 *      inflation   11.71   7.61   5.40   4.54   3.83   2.65   0.26  -1.48
 *
 *      15% reached over   0m     6m    12m    18m    24m    36m
 *      inflation        -1.48  -0.80   0.68   2.48   4.84  16.26
 *
 * Both are smooth monotone curves. Gradualism now costs you inflation
 * SMOOTHLY — which is correct economics, and is the lesson the scenario is
 * for — instead of falling off a cliff between 18 and 24 months.
 *
 * THE MECHANISM `docs/12` NAMED WAS WRONG AND IT MATTERS. It said: "demand
 * responds to the REAL user cost, expectations are formed entirely from
 * realised inflation, and the transmitted rate takes about three years to
 * arrive", and concluded that the missing forward-looking expectations channel
 * was the defect. The first two clauses are still true and unchanged. Only the
 * third was fixed — the transmitted rate now arrives in a quarter — and the
 * knife-edge went with it. **The expectations block was never the cause.**
 * That is the standing rule of this pass earning its place: docs/12 measured a
 * real bifurcation and attributed it to a channel it had never switched off.
 *
 * WHAT REMAINS, AND IT IS NOT A DEFECT. A peg below the Fisher point still
 * diverges, given long enough. Same experiment read at three horizons:
 *
 *      rate      m36      m60       m96
 *       6%     11.71    81.55   2036.23
 *      6.5%     7.61    17.31    388.53
 *       7%      5.40     3.92      0.17
 *       9%      2.65    -1.55     -4.00
 *
 * The separatrix sits at ~6.75%, against expected inflation of 7.0% and a
 * neutral real rate of 0.5%. A fixed nominal rate below expected inflation
 * plus r* MUST eventually spiral: that is the Taylor principle, it is the one
 * thing the audit brief said explicitly must not be "fixed", and a model
 * without it would be teaching something false. What changed is that the
 * separatrix is now WHERE THE ARITHMETIC PUTS IT rather than 1.5pp above it,
 * and the approach to it is a curve rather than a cliff.
 *
 * The residual sharpness NEAR the separatrix is the asset-wealth channel, and
 * that is Section B — measured in test/transmission.test.js, which shows the
 * steepest local response falling from -149.2 to -22.5pp per pp with
 * WEALTH_EFFECT switched off.
 */
test('THE ONE FINDING UNDERNEATH ALL FOUR: the bifurcation is gone', () => {
  const disinflates = (target, overMonths) => {
    const policy = {};
    if (overMonths === 0) policy[0] = (w) => dial(w, 'policy_rate', target);
    else for (let m = 1; m <= overMonths; m++) {
      policy[m] = (w) => dial(w, 'policy_rate', 2.5 + (target - 2.5) * m / overMonths);
    }
    const r = episode({
      months: 60,
      start: { inflation: 8.0, expected_inflation: 7.0, credibility: 0.6,
               unemployment: 4.0, policy_rate: 2.5, yield_10y: 3.25 },
      policy,
    });
    return r.at(36).inflation;
  };
  // Neighbouring policies must give neighbouring answers. They do not.
  const at7 = disinflates(7, 0), at9 = disinflates(9, 0);
  assert.ok(Math.abs(at7 - at9) < 20,
    `a 7% policy rate leaves inflation at ${at7.toFixed(2)}% and a 9% rate at ` +
    `${at9.toFixed(2)}% after three years. Two points of policy cannot separate ` +
    `hyperinflation from success — that is a bifurcation, not a response curve.`);
  // And the path to a destination must not decide whether it works.
  const fast = disinflates(15, 0), slow = disinflates(15, 24);
  assert.ok(Math.abs(fast - slow) < 20,
    `reaching 15% immediately leaves inflation at ${fast.toFixed(2)}% and reaching ` +
    `the same 15% over 24 months leaves it at ${slow.toFixed(2)}%. Gradualism ` +
    `cannot be the difference between disinflation and hyperinflation.`);
});
