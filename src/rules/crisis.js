/**
 * CRISIS AFTERMATH  [research 2.4]
 *
 * A crash is not a game-over screen. It is a playable, permanently harder
 * state — which is what makes the credit gap worth watching.
 */
import { P } from '../params.js';
import { clamp, annualToMonthlyFlow } from '../units.js';

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

  // THE STRUCTURAL IMPULSE, BACKED OUT OF THE OBSERVATION (docs/12, section 2).
  //
  // CRISIS_OUTPUT_TROUGH is -9%, and that is the OBSERVED peak-to-trough fall
  // in the data — a number that already contains the multiplier that produced
  // it. This line used to be `= Math.abs(CRISIS_OUTPUT_TROUGH)`, feeding the
  // observation in as an exogenous demand impulse, which the model's own
  // consumption multiplier, accelerator and capital channel then amplified a
  // SECOND time. Measured: an 8.66pp drag moved the gap 11.46pp on the first
  // tick (1.32x) and 1.68x by the trough, and the realised trough was -23.5%
  // against a published -6 to -15. Same class of error as decision A3, and it
  // is a unit error rather than a magnitude disagreement.
  //
  // So the observation is DECONVOLVED: impulse = observed trough over the
  // model's own measured amplification. CRISIS_OUTPUT_TROUGH keeps its value,
  // because as an observation it is correct — it just is not an input.
  if (s.crisis_months === 1) {
    s.transitory_shock = Math.abs(P.CRISIS_OUTPUT_TROUGH.value) /
                         P.CRISIS_IMPULSE_AMPLIFICATION.value;
  }

  // The scar is still being written for the first year. After that it is what
  // it is, and no amount of spending buys it back.
  //
  // RECAPITALISATION IS A QUANTITY OF MONEY, NOT A SPENDING RATE (docs/12 L1).
  // RECAP_FULL_RESPONSE's unit is "pp of GDP of extra public spending in year
  // one" — a CUMULATIVE injection, and TARP-sized because that is what TARP
  // was. This used to read `extra` as the CURRENT RATE and take a running
  // Math.max over it, so a one-month +5pp spike costing 0.42pp-years of GDP
  // scored a full 1.000 and halved the scar, while +1pp held for a full year —
  // 2.4x the money — scored 0.200. The single most exploitable thing in the
  // game: a gesture beat a programme. Now the rate is integrated (a month of
  // spending at `extra` pp/yr buys extra/12 pp-years) and the running total is
  // what is compared against the parameter, so more money always buys more.
  if (s.crisis_months <= P.RECAP_WINDOW_MONTHS.value) {
    const extra = Math.max(0,
      s.govt_spending + s.money_printed - s.crisis_spending_baseline);
    s.recap_spent += annualToMonthlyFlow(extra);
    s.recap_promptness = clamp(s.recap_spent / P.RECAP_FULL_RESPONSE.value, 0, 1);
    // Deconvolved, exactly like the impulse above. Cerra & Saxena's ~10% is
    // the TOTAL divergence from trend, and this model already produces 8.4pp
    // of it with no exogenous scar at all — capital destruction, a contracted
    // credit stock, and an output gap that has not closed at five years. The
    // exogenous CAPACITY cut is what is left over.
    s.scar_target = s.potential_at_crisis *
                    (P.CRISIS_HYSTERESIS_SCAR.value / 100) /
                    P.CRISIS_SCAR_AMPLIFICATION.value *
                    (1 - s.recap_promptness * P.RECAP_RECOVERY_MULTIPLIER.value);
  }

  // ONE TIME CONSTANT, USED TWICE, AND THAT IS THE MECHANISM (docs/12 §2).
  //
  // The drag DECAYS on tau and the scar GROWS on tau, because the scar IS the
  // part of the collapse that never comes back. Hysteresis, written as
  // arithmetic instead of asserted.
  //
  // The scar used to land IN FULL ON MONTH ONE — measured 10.221 at month 1
  // and 10.221 at month 12 — which is a second reduced-form error sitting on
  // top of the first. Cerra & Saxena measure a level that diverges from TREND
  // over YEARS; nothing in that paper says a banking crisis removes a tenth of
  // capacity in thirty days. Landing it instantly made the scar a second
  // contribution to the TROUGH, when its whole content is about the horizon.
  // Phased, it contributes 39% of its eventual value at the trough and 90% at
  // month 60, which is where Cerra-Saxena's ~10% is measured.
  const tau = P.CRISIS_YEARS_TO_RECOVER.value * 12 / Math.LN10;
  s.crisis_drag = s.transitory_shock * Math.exp(-s.crisis_months / tau);
  s.scar = s.scar_target * (1 - Math.exp(-s.crisis_months / tau));

  trace.record('crisis', {
    'temporary collapse in demand': -s.crisis_drag,
    'permanent loss of capacity (scarring)': -s.scar,
  }, -(s.crisis_drag + s.scar), {
    months_since: s.crisis_months,
    recapitalisation: s.recap_promptness,
    recap_injected_pp_of_gdp: s.recap_spent,
    scar_when_fully_arrived: s.scar_target,
    scar_still_open: s.crisis_months <= P.RECAP_WINDOW_MONTHS.value,
    note: s.crisis_months <= P.RECAP_WINDOW_MONTHS.value
      ? 'spending now still shrinks the permanent damage — after a year it does not'
      : 'output does not cycle back — the trend moved down and stays down',
  });

  // The crisis is over when BOTH halves are spent: the demand collapse has
  // decayed AND the scar has finished arriving. Testing the drag alone was
  // safe while the scar landed instantly; now that it phases in, ending the
  // crisis early would freeze the scar part-way and quietly hand back
  // permanent damage that Cerra & Saxena say never comes back.
  if (s.crisis_drag < 0.1 && s.scar > s.scar_target - 0.1) s.crisis_active = false;
}
