/**
 * MONEY, VELOCITY, MONETISATION  [A6, research 2.1-2.2]
 *
 * The honest answer to "why can't we just print money": you can, and
 * sometimes you should. The constraint isn't the money — it's real goods and
 * labour. Printing when factories sit idle puts them to work. Printing when
 * everyone's employed just raises prices. The inflation is a tax, it falls
 * hardest on savers and people on fixed incomes, and nobody voted for it.
 */
import { P } from '../params.js';
import { clamp, annualRateToMonthlyLinear, annualToMonthlyFlow } from '../units.js';

export function updateMoneySupply(s, trace) {
  const nominalGrowth = s.potential_growth + s.inflation;
  const organic = s.money_supply * annualRateToMonthlyLinear(nominalGrowth / 100);
  const printed = annualToMonthlyFlow(s.money_printed);

  trace.record('money_supply', {
    'growing with the economy': organic,
    'printed by the government': printed,
  }, organic + printed);
  s.money_supply += organic + printed;
}

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
 *   passthrough = credibility_factor * slack_factor      SMOOTH, not a threshold
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
 * Printing also raises money supply without raising debt, which is why it
 * looks free, and erodes credibility, which is why it isn't.
 */
export function updateMonetisation(s, trace) {
  const gate = P.MONETISATION_CREDIBILITY_GATE.value;
  const credFactor = clamp((gate - s.credibility) / gate, 0, 1);

  const slack = Math.max(0, -s.output_gap);
  const slackFactor = clamp(1 - slack / P.MONETISATION_SLACK_GATE.value, 0, 1);

  const passthrough = credFactor * slackFactor;
  s.monetisation_passthrough = s.money_printed * passthrough;

  // Printing erodes credibility directly, in proportion to how much you do.
  if (s.money_printed > 0) {
    s.credibility = Math.max(0, s.credibility - 0.0015 * s.money_printed);
  }

  trace.record('money printing -> inflation', {
    'money printed (% of GDP)': s.money_printed,
    'suppressed by idle capacity': -s.money_printed * (1 - slackFactor),
    'suppressed by a credible central bank': -s.money_printed * slackFactor * (1 - credFactor),
  }, s.monetisation_passthrough, {
    passthrough,
    credibility_factor: credFactor,
    slack_factor: slackFactor,
    note: passthrough < 0.1
      ? 'idle factories and a trusted central bank are absorbing this'
      : 'no slack and nobody believes the target — this goes straight to prices',
  });
}
