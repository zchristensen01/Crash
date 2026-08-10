/**
 * CRISIS AFTERMATH  [research 2.4]
 *
 * A crash is not a game-over screen. It is a playable, permanently harder
 * state — which is what makes the credit gap worth watching.
 */
import { P } from '../params.js';

/**
 * THE FINDING THAT CHANGES WHAT LOSING MEANS: Cerra & Saxena (AER 2008) find
 * NO significant rebound after financial crises. Output does not cycle back —
 * the TREND moves down and stays down. ~10% permanently for a banking crisis.
 *
 * Peak-to-trough ~9%, recovery ~5 years, and prompt recapitalisation within
 * about a year roughly halves the permanent scar. That last number is what
 * gives the post-crash phase a real decision instead of just waiting.
 */
export function updateCrisisRecovery(s, trace) {
  if (!s.crisis_active) return;

  s.crisis_months = (s.crisis_months || 0) + 1;

  if (s.crisis_months === 1) {
    const promptness = s.recap_promptness || 0;
    s.scar = s.potential_output * (P.CRISIS_HYSTERESIS_SCAR.value / 100) *
             (1 - promptness * P.RECAP_RECOVERY_MULTIPLIER.value);
    s.transitory_shock = Math.abs(P.CRISIS_OUTPUT_TROUGH.value);
  }

  const tau = P.CRISIS_YEARS_TO_RECOVER.value * 12 / 2.3;
  const remaining = s.transitory_shock * Math.exp(-s.crisis_months / tau);
  s.crisis_drag = remaining;

  trace.record('crisis', {
    'temporary collapse in demand': -remaining,
    'permanent loss of capacity (scarring)': -s.scar,
  }, -(remaining + s.scar), {
    months_since: s.crisis_months,
    note: 'output does not cycle back — the trend moved down and stays down',
  });

  if (remaining < 0.1) s.crisis_active = false;
}
