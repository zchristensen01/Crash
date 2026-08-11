/**
 * THE CRASH CHAIN.
 *
 * docs/02 Part 3 spends more words on this than on anything else, and before
 * the docs/07 audit almost none of it existed in code:
 *
 *   L7  crisis_drag — the ~9% demand collapse — was computed every tick and
 *       read by nothing, so a financial crisis cost 0.7pp of unemployment and
 *       produced no recession at all. Only the permanent scar reached the
 *       model, and a scar cuts potential and actual output together.
 *   L7  recap_promptness was set to 0 and nothing could raise it, so the
 *       decision RECAP_RECOVERY_MULTIPLIER exists to create did not exist.
 *   M4  the fire-sale term never fired in ANY scenario over a full term.
 *   M5  bank capital never fell below 13.01%, so forced deleveraging — the
 *       quantity leg of the doom loop — had nothing to trigger it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { P } from '../src/params.js';
import { EVENTS } from '../src/game/events.js';
import { SCENARIOS } from '../src/game/scenarios.js';
import { world, advance, dial } from './harness.mjs';

const CRASH = EVENTS.find((e) => e.key === 'financial_crisis');

function crash({ scenario = 'bubble', response = null, months = 24 } = {}) {
  const base = world({ overrides: SCENARIOS[scenario].overrides });
  const hit = world({ overrides: SCENARIOS[scenario].overrides });
  advance(base, 36); advance(hit, 36);
  CRASH.apply(hit.s);
  if (response) response(hit);
  advance(base, months); advance(hit, months);
  return { base: base.s, hit: hit.s, d: (k) => hit.s[k] - base.s[k] };
}

test('a crash causes a recession, not just a haircut', () => {
  const r = crash({ months: 12 });
  assert.ok(r.d('unemployment') > 1.5,
    `the crash raised unemployment by only ${r.d('unemployment').toFixed(2)}pp`);
  assert.ok(r.d('output_gap') < -4,
    `the crash moved the output gap by only ${r.d('output_gap').toFixed(2)}pp — ` +
    `crisis_drag is not reaching demand`);
});

test('the demand collapse fades but the scar does not', () => {
  const early = crash({ months: 12 });
  const late = crash({ months: 84 });
  assert.ok(late.hit.crisis_drag < early.hit.crisis_drag * 0.5,
    'the transitory collapse should be unwinding after seven years');
  assert.ok(late.hit.scar > 1,
    `the permanent scar is ${late.hit.scar.toFixed(2)} — Cerra & Saxena find ` +
    `output shifts the trend and does not cycle back`);
  assert.ok(late.d('potential_output') < -1,
    'potential output has to stay below where it would have been');
});

test('spending in the first year after a crash shrinks the permanent scar', () => {
  // The whole point of RECAP_RECOVERY_MULTIPLIER, and there was no way to
  // earn it. Recapitalisation is a fiscal operation, so extra spending inside
  // RECAP_WINDOW_MONTHS is read as the response.
  const passive = crash({ months: 36 });
  const prompt = crash({
    months: 36,
    response: (w) => dial(w, 'govt_spending', w.s.govt_spending + P.RECAP_FULL_RESPONSE.value),
  });
  assert.ok(prompt.hit.recap_promptness > 0.9,
    `a full RECAP_FULL_RESPONSE injection scored only ${prompt.hit.recap_promptness}`);
  assert.ok(prompt.hit.scar < passive.hit.scar * 0.75,
    `scar ${prompt.hit.scar.toFixed(2)} with a prompt response vs ` +
    `${passive.hit.scar.toFixed(2)} without — the decision does nothing`);
});

test('waiting past the window costs you the discount', () => {
  const late = crash({
    months: 36,
    response: (w) => { advance(w, P.RECAP_WINDOW_MONTHS.value + 2);
                       dial(w, 'govt_spending', w.s.govt_spending + P.RECAP_FULL_RESPONSE.value); },
  });
  const passive = crash({ months: 36 });
  assert.ok(Math.abs(late.hit.scar - passive.hit.scar) < 0.01,
    'spending after the window still bought a smaller scar');
});

test('forced selling fires in the bubble, and then stops', () => {
  // M4: it never fired anywhere, because leverage was anchored on the
  // canonical START while its denominator moved with the scenario.
  const w = world({ overrides: SCENARIOS.bubble.overrides });
  advance(w, 36);
  CRASH.apply(w.s);
  let fired = 0, peakLev = 0;
  for (let m = 0; m < 96; m++) {
    advance(w, 1);
    if (w.s.leverage > w.s.leverage_max) fired += 1;
    peakLev = Math.max(peakLev, w.s.leverage);
  }
  assert.ok(fired > 6, `forced selling ran for only ${fired} months`);
  assert.ok(peakLev > w.s.leverage_max, 'leverage never crossed the gate');
  assert.ok(w.s.asset_prices > 20,
    `asset index bottomed out at ${w.s.asset_prices.toFixed(1)} — the fire sale ` +
    `has no exit. Prices are in leverage's denominator, so the loop only ` +
    `terminates because distressed sellers run out of capacity.`);
  assert.ok(w.s.fire_sale_spent > 0, 'the selling budget was never drawn on');
});

test('THE DOOM LOOP: banks below the floor cut lending and widen spreads', () => {
  // M5: BANK_CAPITAL_DELEVER_TRIGGER was unread because the regulatory
  // minimum it is measured against had never been given a value, so the
  // quantity leg of the loop did not exist at all — bank capital reached the
  // credit spread through an invented coefficient and nothing else.
  const healthy = world({ overrides: { bank_capital_ratio: 13 } });
  const broken = world({ overrides: { bank_capital_ratio: P.BANK_CAPITAL_MINIMUM.value - 2 } });
  advance(healthy, 6); advance(broken, 6);
  assert.equal(healthy.s.bank_capital_shortfall, 0);
  assert.ok(broken.s.bank_capital_shortfall > 1,
    'a bank 2pp under the floor is not registering a shortfall');
  assert.ok(broken.s.credit_growth_annual < healthy.s.credit_growth_annual - 2,
    `credit grew at ${broken.s.credit_growth_annual.toFixed(2)}% with banks under ` +
    `the floor vs ${healthy.s.credit_growth_annual.toFixed(2)}% healthy — banks are ` +
    `not cutting lending`);
  assert.ok(broken.s.credit_spread > healthy.s.credit_spread,
    'thin banks are not charging more');
});

test('a crash takes a real bite out of bank capital', () => {
  // What the model says: a system starting at 13% loses about 2pp to a
  // crash and stays above the Basel floor. Thin banks are what arm the loop,
  // which is the correct lesson and the reason the buffer exists.
  const w = world({ overrides: SCENARIOS.bubble.overrides });
  advance(w, 36);
  const before = w.s.bank_capital_ratio;
  CRASH.apply(w.s);
  let minCapital = Infinity;
  for (let m = 0; m < 96; m++) {
    advance(w, 1);
    minCapital = Math.min(minCapital, w.s.bank_capital_ratio);
  }
  assert.ok(before - minCapital > 1.5,
    `bank capital fell only ${(before - minCapital).toFixed(2)}pp through a crash`);
});

test('defaulted debt leaves the credit stock', () => {
  // Without write-offs the deleveraging spiral has no accounting exit: credit
  // stays put while the collateral behind it evaporates.
  const w = world({ overrides: SCENARIOS.bubble.overrides });
  advance(w, 36);
  const before = w.s.private_credit;
  CRASH.apply(w.s);
  advance(w, 36);
  assert.ok(w.s.write_offs > 0, 'no debt was written off during a crisis');
  assert.ok(w.s.private_credit < before, 'the credit stock never contracted');
});

test('a crash is survivable and the economy is still playable afterwards', () => {
  // "A crash should not be a game-over screen — it should be a playable,
  // permanently harder state." docs/02 Part 3.
  const w = world({ overrides: SCENARIOS.bubble.overrides, taylor: true });
  advance(w, 24);
  CRASH.apply(w.s);
  assert.doesNotThrow(() => advance(w, 72));
  assert.ok(w.s.unemployment < 14, `unemployment ended at ${w.s.unemployment.toFixed(1)}`);
  assert.ok(w.s.output_gap > -20, `output gap ended at ${w.s.output_gap.toFixed(1)}`);
});
