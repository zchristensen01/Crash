/**
 * LABOUR  [research 1.5]
 * Firms hire slowly and fire fast. Doc 02 calls that asymmetry "most of why
 * monetary policy is hard": overshooting a hike takes years to undo.
 */
import { P } from '../params.js';
import { clamp } from '../units.js';

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
 * OKUN IS A SWITCH, NOT A CONSTANT. Beta flattens to ~0.20 under labour
 * hoarding (Japan structurally, euro area post-Covid): firms hold staff
 * through the trough and unemployment barely moves. A model with a fixed beta
 * would have been badly wrong about 2020-22.
 */
export function updateEmployment(s, trace) {
  const hoarding = s.output_gap < -2.0 && s.labour_hoarding_policy !== false;
  const beta = hoarding ? P.OKUN_LABOUR_HOARDING.value : P.OKUN_BETA.value;
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
