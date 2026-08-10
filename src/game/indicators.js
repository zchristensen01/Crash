/**
 * INDICATORS — the gauges. Data, not code.
 *
 * Two tiers reach the main screen. Everything else is discovered by clicking
 * a headline number and reading the `why` panel — see docs/01 §I. Putting all
 * 42 variables on screen is the same as putting none there.
 *
 * The band thresholds are economics: 9pp is the BIS optimal credit-gap
 * threshold, 0.7 credibility is where the Phillips slope starts steepening.
 * The verdict strings are the teaching — a number alone tells a beginner
 * nothing, and colour alone is unreadable to ~8% of men.
 */
import { P } from '../params.js';
import { yoyGrowth } from '../units.js';

export const INDICATORS = [
  {
    key: 'growth', label: 'Growth', tier: 'headline',
    get: (s) => yoyGrowth(s.history.output),
    fmt: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
    range: [-8, 8],
    verdict: (v) => (v > 4 ? 'booming' : v > 1 ? 'healthy' : v > 0 ? 'sluggish' : 'SHRINKING'),
    band: (v) => (v > 0.5 ? 'ok' : v > -1 ? 'warn' : 'danger'),
    help: 'How much more the country made this year than last.',
  },
  {
    key: 'inflation', label: 'Inflation', tier: 'headline',
    get: (s) => s.inflation,
    fmt: (v) => `${v.toFixed(1)}%`,
    range: [-3, 15],
    verdict: (v) => (v < 0 ? 'DEFLATION' : v < 1 ? 'cold' : v < 3 ? 'on target'
      : v < 6 ? 'running hot' : 'OUT OF CONTROL'),
    band: (v) => (v >= 1 && v < 3 ? 'ok' : v < 6 ? 'warn' : 'danger'),
    help: 'How fast prices are rising. 2% is the goal.',
  },
  {
    key: 'unemployment', label: 'Unemployment', tier: 'headline',
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
    get: (s) => s.govt_debt,
    fmt: (v) => `${v.toFixed(0)}%`,
    range: [0, 250],
    verdict: (v) => (v < 60 ? 'low' : v < 100 ? 'fine' : v < 160 ? 'heavy' : 'DANGEROUS'),
    band: (v) => (v < 100 ? 'ok' : v < 160 ? 'warn' : 'danger'),
    help: 'Everything the government owes, as a share of one year of the ' +
      'economy. What matters is not the level but whether interest is ' +
      'growing faster than the economy.',
  },
  {
    key: 'approval', label: 'Approval', tier: 'headline',
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
    get: (s) => s.credit_to_gdp_gap,
    fmt: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}pp`,
    range: [-5, 15],
    verdict: (v) => (v < 3 ? 'borrowing near trend'
      : v < P.CREDIT_GAP_CRISIS_THRESHOLD.value ? 'above trend — watch this'
      : 'PAST THE 9pp DANGER LINE'),
    band: (v) => (v < 3 ? 'ok' : v < P.CREDIT_GAP_CRISIS_THRESHOLD.value ? 'warn' : 'danger'),
    help: 'How far private borrowing has run above its own trend. THE ONLY ' +
      'GAUGE THAT SEES A CRASH COMING — growth, jobs, inflation and public ' +
      'mood all look fine through the entire build-up. 9pp is the BIS line, ' +
      'and it catches about two thirds of real crises.',
  },
  {
    key: 'credibility', label: 'Credibility', tier: 'watched',
    get: (s) => s.credibility,
    fmt: (v) => v.toFixed(2),
    range: [0, 1],
    verdict: (v) => (v > 0.7 ? 'anchored' : v > 0.4 ? 'SLIPPING' : 'LOST'),
    band: (v) => (v > 0.7 ? 'ok' : v > 0.4 ? 'warn' : 'danger'),
    help: 'Whether people still believe you will hit 2%. While it holds, ' +
      'inflation barely responds to demand. Once it goes, expectations ' +
      'chase actual inflation and the whole thing spirals. It falls about ' +
      'three times faster than it rebuilds.',
  },
];
