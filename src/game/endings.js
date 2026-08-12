/**
 * ENDINGS — ways to lose. Data plus one checker.
 *
 * EVERY ENDING IS A SUSTAINED CONDITION, never an instantaneous trip. A game
 * that ends on a single spike teaches you to fear noise instead of trends,
 * and the prototype's instantaneous thresholds did exactly that.
 *
 * These also make the model well-behaved. Several loops in it are
 * deliberately unbalanced (parameters.py UNBALANCED_LOOPS) — the debt-service
 * spiral in particular has no brake, because the brake is meant to be YOU.
 * Left running, debt reaches Infinity around tick 73. The ending is what
 * turns that from a numerical blowup into a lesson.
 */
/**
 * THE FOUR THRESHOLDS, AND ALL OF THEM ARE JUDGEMENT [4th audit 5.11].
 *
 * These were bare literals inside the data below until check (f)'s scope was
 * extended to this file, and the plan's own priority for 5.3 was "anything
 * that decides an ENDING or a GATE". Nothing decides more.
 *
 * THEY ARE DELIBERATELY NOT IN `parameters.py`, AND THAT IS THE HONEST
 * PLACEMENT. An ending threshold is a GAME DESIGN decision about when the run
 * stops being instructive, not an estimate of anything in the world. Putting
 * `inflation > 25` in the parameter file with a range and a citation would
 * dress a design choice as a measurement, which is the error the whole
 * SOLVED_FROM_MODEL register exists to prevent one level down. They are named
 * and labelled here instead, where the design decision lives.
 *
 * Where a real number informs one, it is stated:
 *
 *   HYPERINFLATION at 25%/yr sustained 6 months. Cagan's classic definition is
 *   50% a MONTH, which is an order of magnitude past anything this model
 *   should still be teaching from. 25 a year held half a year is "expectations
 *   have gone and the run is over".
 *
 *   DEPRESSION at 14% sustained a year. US unemployment peaked near 25% in
 *   1933 and Spain passed 26% in 2013; 14 held for twelve months is well
 *   inside recorded experience and past anything a policy mistake in this
 *   model should survive.
 *
 *   DEBT CRISIS is a CONJUNCTION, and the conjunction is the lesson. 200% of
 *   GDP alone is Japan, which is fine; a 12% yield alone is a periphery
 *   repricing. Both together for a quarter is the trap `debt_trap` exists to
 *   teach, and neither number alone would teach it.
 *
 *   THROWN OUT at 5 approval sustained a quarter. Pure design: the floor is
 *   0 and this is "nobody at all".
 */
const HYPERINFLATION_PCT = 25;      // judgement, see above
const HYPERINFLATION_MONTHS = 6;    // judgement, see above
const DEPRESSION_UNEMP_PCT = 14;    // judgement, see above
const DEPRESSION_MONTHS = 12;       // judgement, see above
const DEBT_CRISIS_DEBT_PCT = 200;   // judgement: with the yield below, not alone
const DEBT_CRISIS_YIELD_PCT = 12;   // judgement: with the debt above, not alone
const DEBT_CRISIS_MONTHS = 3;       // judgement, see above
const VOTED_OUT_APPROVAL = 5;       // judgement, see above
const VOTED_OUT_MONTHS = 3;         // judgement, see above

export const ENDINGS = [
  {
    key: 'hyperinflation',
    title: 'HYPERINFLATION',
    test: (s) => s.inflation > HYPERINFLATION_PCT,
    months: HYPERINFLATION_MONTHS,
    lesson: 'Money stopped meaning anything. Once people EXPECT high ' +
      'inflation they price it in ahead of time and it feeds itself. You ' +
      'have to break expectations early, and it always hurts to do it.',
  },
  {
    key: 'depression',
    title: 'DEPRESSION',
    test: (s) => s.unemployment > DEPRESSION_UNEMP_PCT,
    months: DEPRESSION_MONTHS,
    lesson: 'You squeezed demand so hard the jobs went with it. Firms fire ' +
      'in weeks and hire over quarters, so by the time you saw it you were ' +
      'already a year late.',
  },
  {
    key: 'debt_crisis',
    title: 'DEBT CRISIS',
    test: (s) => s.govt_debt > DEBT_CRISIS_DEBT_PCT && s.yield_10y > DEBT_CRISIS_YIELD_PCT,
    months: DEBT_CRISIS_MONTHS,
    lesson: 'Nobody will lend to you any more. High debt plus high rates ' +
      'means the debt grows on its own — and raising rates to fight ' +
      'inflation makes it worse. There was no year in which this was easy ' +
      'to fix; there were several in which it was easier than now.',
  },
  {
    key: 'voted_out',
    title: 'THROWN OUT OF OFFICE',
    test: (s) => s.approval <= VOTED_OUT_APPROVAL,
    months: VOTED_OUT_MONTHS,
    lesson: 'The numbers may have been recovering. People vote on how the ' +
      'last year FELT, not on your five-year plan. That constraint is real ' +
      'and it is why good policy often does not happen.',
  },
];

/**
 * Advance each ending's countdown and return the one that fired, if any.
 * @returns {{ending:Object, monthsRemaining:number}|null}
 *
 * s.ending_counters holds months-so-far per ending. A condition that breaks
 * resets its counter to zero — which is what makes the on-screen countdown
 * ("hyperinflation in 4 months") something the player can actually beat.
 */
export function checkEndings(s) {
  s.ending_counters = s.ending_counters || {};
  for (const e of ENDINGS) {
    s.ending_counters[e.key] = e.test(s) ? (s.ending_counters[e.key] || 0) + 1 : 0;
    if (s.ending_counters[e.key] >= e.months) {
      s.ending = e;
      return { ending: e, monthsRemaining: 0 };
    }
  }
  return null;
}

/** Endings whose countdown is running, for the warning panel. */
export function pendingEndings(s) {
  return ENDINGS
    .filter((e) => (s.ending_counters?.[e.key] || 0) > 0)
    .map((e) => ({ title: e.title, monthsRemaining: e.months - s.ending_counters[e.key] }));
}
