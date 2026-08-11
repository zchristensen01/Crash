/**
 * CRISIS AFTERMATH  [research 2.4]
 *
 * A crash is not a game-over screen. It is a playable, permanently harder
 * state — which is what makes the credit gap worth watching.
 */
import { P } from '../params.js';
import { clamp } from '../units.js';

/**
 * THE FINDING THAT CHANGES WHAT LOSING MEANS: Cerra & Saxena (AER 2008) find
 * NO significant rebound after financial crises. Output does not cycle back —
 * the TREND moves down and stays down. ~10% permanently for a banking crisis.
 *
 * Peak-to-trough ~9%, recovery ~5 years, and prompt recapitalisation within
 * about a year roughly halves the permanent scar.
 *
 * TWO THINGS HERE WERE COMPUTED AND THROWN AWAY (docs/07 L7):
 *
 *  1. crisis_drag — the ~9% demand collapse — was written every tick and read
 *     by nothing. Only the scar reached the model, and a scar cuts potential
 *     and actual output together, so the output GAP barely moved and
 *     unemployment peaked 0.7pp above baseline. THE CRASH cost almost no
 *     jobs. It is now a term in aggregateDemand.
 *  2. recap_promptness was set to 0 by the crisis event and read here, and
 *     nothing anywhere could raise it. The decision RECAP_RECOVERY_MULTIPLIER
 *     exists to create did not exist.
 *
 * Recapitalisation is a fiscal operation — you inject public capital into
 * banks — so the game does not need a separate dial for it. Extra government
 * spending (borrowed or printed) inside RECAP_WINDOW_MONTHS of the crash IS
 * the recapitalisation, and the scar stays open to revision for that window
 * instead of being fixed on the first tick.
 *
 * This runs EARLY, right after the supply side: it sets crisis_drag, which
 * aggregateDemand reads three rules later, and the scar, which
 * updatePotentialOutput reads next month.
 */
export function updateCrisisRecovery(s, trace) {
  if (!s.crisis_active) {
    s.crisis_drag = 0;
    return;
  }

  s.crisis_months = (s.crisis_months || 0) + 1;

  // The baseline and the pre-crash capacity are snapshotted by the event
  // itself, so a response inside the first month still counts.
  if (s.crisis_months === 1) {
    s.transitory_shock = Math.abs(P.CRISIS_OUTPUT_TROUGH.value);
  }

  // The scar is still being written for the first year. After that it is what
  // it is, and no amount of spending buys it back.
  if (s.crisis_months <= P.RECAP_WINDOW_MONTHS.value) {
    const extra = Math.max(0,
      s.govt_spending + s.money_printed - s.crisis_spending_baseline);
    s.recap_promptness = Math.max(s.recap_promptness,
      clamp(extra / P.RECAP_FULL_RESPONSE.value, 0, 1));
    s.scar = s.potential_at_crisis * (P.CRISIS_HYSTERESIS_SCAR.value / 100) *
             (1 - s.recap_promptness * P.RECAP_RECOVERY_MULTIPLIER.value);
  }

  const tau = P.CRISIS_YEARS_TO_RECOVER.value * 12 / 2.3;
  s.crisis_drag = s.transitory_shock * Math.exp(-s.crisis_months / tau);

  trace.record('crisis', {
    'temporary collapse in demand': -s.crisis_drag,
    'permanent loss of capacity (scarring)': -s.scar,
  }, -(s.crisis_drag + s.scar), {
    months_since: s.crisis_months,
    recapitalisation: s.recap_promptness,
    scar_still_open: s.crisis_months <= P.RECAP_WINDOW_MONTHS.value,
    note: s.crisis_months <= P.RECAP_WINDOW_MONTHS.value
      ? 'spending now still shrinks the permanent damage — after a year it does not'
      : 'output does not cycle back — the trend moved down and stays down',
  });

  if (s.crisis_drag < 0.1) s.crisis_active = false;
}
