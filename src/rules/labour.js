/**
 * LABOUR  [research 1.5]
 * Firms hire slowly and fire fast. Doc 02 calls that asymmetry "most of why
 * monetary policy is hard": overshooting a hike takes years to undo.
 */
import { P } from '../params.js';
import { clamp, lerp } from '../units.js';

/**
 *   target_u = u* - beta * output_gap                (Okun)
 *   speed    = FIRING_SPEED  when unemployment is RISING toward target
 *            = HIRING_SPEED  when it is FALLING, damped by low momentum
 *   u[t]     = u[t-1] + speed * (target_u - u[t-1])
 *
 * HIRING_SPEED 0.25 vs FIRING_SPEED 0.60 (Davis & Haltiwanger gross flows).
 * Job destruction is lumpy and concentrated; creation is smooth and slow. So
 * unemployment rises fast and falls slowly, and hiring_momentum makes
 * recoveries slower still — it has to rebuild before hiring accelerates.
 *
 * OKUN IS A RAMP, NOT A CONSTANT AND NOT A SWITCH. Beta flattens toward ~0.20
 * under labour hoarding (Japan structurally, euro area post-Covid): firms hold
 * staff through the trough and unemployment barely moves. A model with a fixed
 * beta would have been badly wrong about 2020-22.
 *
 * IT IS SYMMETRIC IN |output_gap|, AND THAT IS THE FIX FOR TWO FINDINGS.
 * Coded as a hard switch at gap < -2 it did two bad things (docs/07 L5, L6):
 *
 *  - Stimulus that carried the gap up across -2 doubled beta and RAISED the
 *    Okun target, so +1pp of government spending increased unemployment for
 *    every starting gap between -3.0 and -2.2. That band is the ordinary
 *    recession the player spends most of the game in.
 *  - A -3pp demand shock got beta 0.20 and a +3pp shock got 0.45, so an equal
 *    boom moved employment three times further than a slump — inverting
 *    "firms fire in weeks and hire over quarters", which doc 02 calls most of
 *    why monetary policy is hard.
 *
 * Symmetric is also the better reading of the mechanism: firms that hold
 * staff through a trough do not need to hire hard in the recovery either, and
 * at very low unemployment the labour-supply constraint flattens Okun again.
 * With beta symmetric, the asymmetry lives entirely in FIRING_SPEED vs
 * HIRING_SPEED, which is where Davis & Haltiwanger's evidence actually is.
 */
export function updateEmployment(s, trace) {
  const stretch = s.labour_hoarding_policy === false ? 0
    : clamp(Math.abs(s.output_gap) / P.OKUN_HOARDING_GAP.value, 0, 1);
  const beta = lerp(P.OKUN_BETA.value, P.OKUN_LABOUR_HOARDING.value, stretch);
  const hoarding = stretch > 0.5;
  s.okun_beta_effective = beta;

  const target = Math.max(1.5, s.natural_unemployment - beta * s.output_gap);
  const gapToTarget = target - s.unemployment;

  const rising = gapToTarget > 0;
  const speed = rising
    ? P.FIRING_SPEED.value
    : P.HIRING_SPEED.value * (1 + P.HIRING_MOMENTUM.value * clamp(s.hiring_momentum, 0, 1));

  const change = speed * gapToTarget;
  const before = s.unemployment;
  s.unemployment = clamp(before + change, 0.5, 40);

  // Momentum builds while hiring, collapses immediately when firing starts.
  s.hiring_momentum = rising ? 0
    : P.HIRING_MOMENTUM.value * s.hiring_momentum + (1 - P.HIRING_MOMENTUM.value);

  s.employment = s.labour_force * (1 - s.unemployment / 100);

  trace.record('unemployment', {
    'where it was': before,
    [rising ? 'firms shedding staff (fast)' : 'firms hiring back (slow)']: s.unemployment - before,
  }, s.unemployment, {
    okun_beta: beta,
    labour_hoarding: hoarding,
    adjustment_speed: speed,
    note: rising ? 'firing is 2.4x faster than hiring' : 'recoveries take years',
  });
}
