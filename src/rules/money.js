/**
 * VELOCITY AND MONETISATION  [A6, research 2.1-2.2]
 *
 * The honest answer to "why can't we just print money": you can, and
 * sometimes you should. The constraint isn't the money — it's real goods and
 * labour. Printing when factories sit idle puts them to work. Printing when
 * everyone's employed just raises prices. The inflation is a tax, it falls
 * hardest on savers and people on fixed incomes, and nobody voted for it.
 *
 * The SPENDING half of printing lives in aggregate.js, where the printed
 * money buys things and the slack ceiling decides whether that becomes output
 * or prices. What lives here is the second, faster channel: the direct
 * pass-through to inflation that opens when nobody believes the target any
 * more.
 *
 * updateMoneySupply used to sit at the top of this file. money_supply was
 * written every tick and read by nothing, and neither was velocity: setting
 * both to absurd values changed no other variable in 60 ticks, and M*V never
 * equalled P*Y (docs/07 M3). money_supply is gone; velocity earned its place
 * back by being wired into the pass-through below, which is the loop doc 02
 * describes and the model did not have.
 */
import { P } from '../params.js';
import { clamp } from '../units.js';

/**
 *   log V = v0 + semi_elasticity*log(1+i) + flight
 *   flight = 0                              if E[pi] < 20%
 *          = beta*(E[pi] - 20)^2            otherwise
 *
 * Velocity is exactly what breaks the naive printing-causes-inflation story:
 * at low inflation it absorbs money growth quietly. The convex takeoff past
 * the threshold IS the hyperinflation engine — people spend faster to beat
 * price rises, which is effectively more money still.
 *
 * The threshold is EM/high-inflation evidence and must not fire in an
 * anchored advanced economy.
 */
export function updateVelocity(s, trace) {
  // lint-allow-dial: money demand is a portfolio choice against the CURRENT market
  // rate, so it responds on the announcement. Velocity's own adjustment speed is
  // 0.1/month either way, which swamps the one-month difference a driver would add.
  const i = Math.max(0, s.policy_rate);
  const rateTerm = P.VELOCITY_INTEREST_SEMIELAST.value *
                   Math.log(1 + i / 100) - s.velocity_v0;

  const over = Math.max(0, s.expected_inflation - P.VELOCITY_FLIGHT_THRESHOLD.value);
  const flight = 0.002 * over * over;

  const before = s.velocity;
  const target = 1 + rateTerm + flight;
  const change = 0.1 * (target - before);
  s.velocity = Math.max(0.2, before + change);

  trace.record('velocity', {
    'where it was': before,
    'money moving faster as rates rise': change * (flight === 0 ? 1 : 0),
    'FLIGHT FROM MONEY — spending fast to beat price rises': change * (flight === 0 ? 0 : 1),
  }, s.velocity, {
    flight_active: flight > 0,
    note: flight > 0 ? 'the hyperinflation loop is running'
                     : 'velocity is absorbing money growth quietly',
  });
}

/**
 * THE HIGHEST-PRIORITY FIX IN THE MODEL.
 *
 *   passthrough = credibility_factor * slack_factor * velocity   SMOOTH
 *   credibility_factor = clip((0.5 - credibility)/0.5, 0, 1)
 *   slack_factor       = clip(1 - slack/SLACK_GATE, 0, 1)
 *
 *   anchored + slack  ->  ~0    (why QE after 2008 didn't cause hyperinflation)
 *   unanchored + hot  ->  ~1    (fiscal dominance, EM/high-inflation)
 *
 * The prototype applied printing to inflation UNCONDITIONALLY, which inverts
 * that lesson entirely — a player who ran the obvious experiment learned the
 * opposite of the truth. That was defect 2.
 *
 * Printing also erodes credibility, which is the slow fuse: keep printing and
 * you eventually open the gate you were relying on being shut.
 *
 * The velocity multiplier is 1.0 in every ordinary state, because velocity is
 * pinned at 1 until expected inflation clears VELOCITY_FLIGHT_THRESHOLD. Past
 * it, flight from money multiplies the pass-through — the ⟲ in doc 02's DIAL
 * 5, which the model computed and then ignored (docs/07 M3).
 */
export function updateMonetisation(s, trace) {
  const gate = P.MONETISATION_CREDIBILITY_GATE.value;
  const credFactor = clamp((gate - s.credibility) / gate, 0, 1);

  const slack = Math.max(0, -s.output_gap);
  const slackFactor = clamp(1 - slack / P.MONETISATION_SLACK_GATE.value, 0, 1);

  const flight = clamp(s.velocity, 1, 4);
  const passthrough = credFactor * slackFactor * flight;
  s.monetisation_passthrough = s.money_printed * passthrough;

  // Printing erodes credibility directly, in proportion to how much you do.
  if (s.money_printed > 0) {
    s.credibility = Math.max(0, s.credibility - 0.0015 * s.money_printed);
  }

  const gated = s.money_printed * credFactor * slackFactor;
  trace.record('money printing -> inflation', {
    'money printed (% of GDP)': s.money_printed,
    'suppressed by idle capacity': -s.money_printed * (1 - slackFactor),
    'suppressed by a credible central bank': -s.money_printed * slackFactor * (1 - credFactor),
    'FLIGHT FROM MONEY — velocity multiplying it': gated * (flight - 1),
  }, s.monetisation_passthrough, {
    passthrough,
    credibility_factor: credFactor,
    slack_factor: slackFactor,
    velocity_multiplier: flight,
    note: passthrough < 0.1
      ? 'idle factories and a trusted central bank are absorbing this'
      : 'no slack and nobody believes the target — this goes straight to prices',
  });
}
