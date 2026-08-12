/**
 * INDICATORS — the gauges. Data, not code.
 *
 * Two tiers reach the main screen. Everything else is discovered by clicking
 * a headline number and reading the `why` panel — see docs/01 §I. Putting all
 * 42 variables on screen is the same as putting none there.
 *
 * The band thresholds are economics: the BIS optimal credit-gap threshold,
 * 0.7 credibility is where the Phillips slope starts steepening. The verdict
 * strings are the teaching — a number alone tells a beginner nothing, and
 * colour alone is unreadable to ~8% of men.
 *
 * THAT FIRST SENTENCE IS WHY THIS FILE IS IN CHECK (f)'s SCOPE [4th audit
 * 5.19], and 5.11 got it wrong. 5.11 read this file as "display thresholds"
 * and left it out; the header says the thresholds are ECONOMICS, and it was
 * right. Measured, it held **copies five and six of CREDIT_GAP_WARNING** — the
 * BIS warning line, which 5.3 promoted after finding three in `src/rules/` and
 * 5.11 found a fourth in `events.js`. Both are wired now.
 *
 * WORSE THAN A COPY: the danger line was hardcoded in PLAYER-FACING PROSE as
 * "9pp" while the BAND next to it read the parameter. Move
 * CREDIT_GAP_CRISIS_THRESHOLD and the gauge would have coloured itself against
 * the new value and told the player the old one — a display disagreeing with
 * its own threshold, which is the `price_level` invariant's argument aimed at
 * the screen. The prose interpolates now.
 *
 * WHAT IS STILL A BARE NUMBER HERE IS DELIBERATE. The verdict and band cuts
 * for growth, unemployment, debt and approval are JUDGEMENT about what to tell
 * a beginner, informed by economics but not estimates of it — the same
 * category as `endings.js`'s thresholds, and named rather than promoted for
 * the same reason.
 */
import { P } from '../params.js';
import { yoyGrowth } from '../units.js';

export const INDICATORS = [
  {
    key: 'growth', label: 'Growth', tier: 'headline',
    badness: (v) => -v, trendEpsilon: 0.3,
    historyKey: 'growth', traceKey: 'output_gap',
    // NaN until a full year exists; the gauge renders that as 'gathering data'.
    get: (s) => (s.history.output.length > 12 ? yoyGrowth(s.history.output) : NaN),
    fmt: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
    range: [-8, 8],
    verdict: (v) => (v > 4 ? 'booming' : v > 1 ? 'healthy' : v > 0 ? 'sluggish' : 'SHRINKING'),
    band: (v) => (v > 0.5 ? 'ok' : v > -1 ? 'warn' : 'danger'),
    help: 'How much more the country made this year than last.',
  },
  {
    key: 'inflation', label: 'Inflation', tier: 'headline',
    badness: (v) => Math.abs(v - P.SS_INFLATION_TARGET.value), trendEpsilon: 0.2,
    historyKey: 'inflation', traceKey: 'inflation', param: 'PHILLIPS_KAPPA_ANCHORED',
    get: (s) => s.inflation,
    fmt: (v) => `${v.toFixed(1)}%`,
    range: [-3, 15],
    verdict: (v) => (v < 0 ? 'DEFLATION' : v < 1 ? 'cold' : v < 3 ? 'on target'
      : v < 6 ? 'running hot' : 'OUT OF CONTROL'),
    band: (v) => (v >= 1 && v < 3 ? 'ok' : v < 6 ? 'warn' : 'danger'),
    help: `How fast prices are rising. ${P.SS_INFLATION_TARGET.value}% is the goal.`,
  },
  {
    key: 'unemployment', label: 'Unemployment', tier: 'headline',
    badness: (v) => v, trendEpsilon: 0.2,
    historyKey: 'unemployment', traceKey: 'unemployment', param: 'OKUN_BETA',
    get: (s) => s.unemployment,
    fmt: (v) => `${v.toFixed(1)}%`,
    range: [0, 18],
    verdict: (v) => (v < 4 ? 'very tight' : v < 6.5 ? 'healthy' : v < 9 ? 'painful' : 'CRISIS'),
    band: (v) => (v < 6.5 ? 'ok' : v < 9 ? 'warn' : 'danger'),
    help: 'Share of people who want a job and cannot get one. Voters weigh ' +
      'this about 1.7x more heavily than inflation.',
  },
  {
    key: 'govt_debt', label: 'Govt debt', tier: 'headline',
    badness: (v) => v, trendEpsilon: 1.0,
    historyKey: 'govt_debt', traceKey: 'govt_debt', param: 'BOND_YIELD_DEBT_SLOPE',
    get: (s) => s.govt_debt,
    fmt: (v) => `${v.toFixed(0)}%`,
    range: [0, 250],
    verdict: (v) => (v < 70 ? 'low' : v < 120 ? 'normal' : v < 170 ? 'heavy' : 'DANGEROUS'),
    band: (v) => (v < 120 ? 'ok' : v < 170 ? 'warn' : 'danger'),
    help: 'Everything the government owes, as a share of one year of the ' +
      'economy. What matters is not the level but whether interest is ' +
      'growing faster than the economy.',
  },
  {
    key: 'approval', label: 'Approval', tier: 'headline',
    badness: (v) => -v, trendEpsilon: 1.5,
    historyKey: 'approval', traceKey: 'approval', param: 'APPROVAL_MISERY_WEIGHT',
    get: (s) => s.approval,
    fmt: (v) => v.toFixed(0),
    range: [0, 100],
    verdict: (v) => (v > 80 ? 'thrilled' : v > 55 ? 'content' : v > 30 ? 'grumbling' : 'FURIOUS'),
    band: (v) => (v > 40 ? 'ok' : v > 20 ? 'warn' : 'danger'),
    help: 'Your health bar. People vote on how the last year FELT.',
  },

  // --- the two that matter and nobody watches ---
  {
    key: 'credit_to_gdp_gap', label: 'Credit gap', tier: 'watched',
    badness: (v) => v, trendEpsilon: 0.3,
    historyKey: 'credit_gap', traceKey: 'credit_to_gdp_gap', param: 'CRISIS_PROB_PER_SD_CREDIT',
    get: (s) => s.credit_to_gdp_gap,
    fmt: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}pp`,
    range: [-5, 15],
    verdict: (v) => (v < P.CREDIT_GAP_WARNING.value ? 'borrowing near trend'
      : v < P.CREDIT_GAP_CRISIS_THRESHOLD.value ? 'above trend — watch this'
      : `PAST THE ${P.CREDIT_GAP_CRISIS_THRESHOLD.value}pp DANGER LINE`),
    band: (v) => (v < P.CREDIT_GAP_WARNING.value ? 'ok'
      : v < P.CREDIT_GAP_CRISIS_THRESHOLD.value ? 'warn' : 'danger'),
    help: 'How far private borrowing has run above its own trend. THE ONLY ' +
      'GAUGE THAT SEES A CRASH COMING — growth, jobs, inflation and public ' +
      `mood all look fine through the entire build-up. ` +
      `${P.CREDIT_GAP_CRISIS_THRESHOLD.value}pp is the BIS line, and it ` +
      `catches about two thirds of real crises.`,
  },
  {
    key: 'credibility', label: 'Credibility', tier: 'watched',
    badness: (v) => -v, trendEpsilon: 0.02,
    historyKey: 'credibility', traceKey: 'credibility', param: 'CREDIBILITY_DECAY',
    get: (s) => s.credibility,
    fmt: (v) => v.toFixed(2),
    range: [0, 1],
    verdict: (v) => (v > 0.7 ? 'anchored' : v > 0.4 ? 'SLIPPING' : 'LOST'),
    band: (v) => (v > 0.7 ? 'ok' : v > 0.4 ? 'warn' : 'danger'),
    help: `Whether people still believe you will hit ` +
      `${P.SS_INFLATION_TARGET.value}%. While it holds, ` +
      'inflation barely responds to demand. Once it goes, expectations ' +
      'chase actual inflation and the whole thing spirals. It falls about ' +
      'three times faster than it rebuilds.',
  },
];
