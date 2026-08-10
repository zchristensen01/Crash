/**
 * GLOSSARY — plain-English definitions for everything on screen.
 *
 * Written for someone who has never taken an economics class. No term is
 * defined using another term from this list without also explaining that one.
 * If a definition needs a comma-separated clause to survive, it is too long.
 */
export const GLOSSARY = {
  // --- the gauges ---
  'Growth': 'How much more stuff the country made this year than last year. ' +
    'Around 1.5–2% is normal. Negative means the economy is shrinking.',
  'Inflation': 'How fast prices are rising. 2% a year is the target — low ' +
    'enough to ignore, high enough that people keep spending rather than ' +
    'waiting for things to get cheaper.',
  'Unemployment': 'The share of people who want a job and cannot find one. ' +
    'Around 5% is normal — there are always people between jobs. Below 4% ' +
    'employers start bidding wages up against each other.',
  'Govt debt': 'Everything the government owes, measured against one year of ' +
    'the whole economy. 100% means it owes about one year of national income. ' +
    'The level matters less than whether the interest is growing faster than ' +
    'the economy.',
  'Approval': 'How happy people are with you. Hit zero and you are out of a ' +
    'job. People judge you on how the last year FELT, not on your plan.',
  'Credit gap': 'How much more people and businesses are borrowing than they ' +
    'normally would. THE ONLY GAUGE THAT SEES A CRASH COMING — everything ' +
    'else looks fine right up until it happens. Above 9 is the danger line.',
  'Credibility': 'Whether people still believe you will keep inflation at 2%. ' +
    'While they do, prices barely react to anything you do. Once they stop, ' +
    'every price rise feeds the next one. It falls about three times faster ' +
    'than it rebuilds.',

  // --- the dials ---
  'Rate': 'The interest rate. LOW makes borrowing cheap, so people spend and ' +
    'businesses build — but prices rise. HIGH makes borrowing expensive, ' +
    'which cools everything down and costs jobs.',
  'Tax': 'How much of the economy the government takes in tax. HIGHER leaves ' +
    'people less to spend but pays down debt. LOWER leaves them more, but the ' +
    'government has to borrow the difference.',
  'Spend': 'How much the government spends. The FASTEST lever you have — it ' +
    'adds demand almost immediately, which is why it is the crisis tool. ' +
    'Paid for by tax, by borrowing, or by printing.',
  'Print': 'Create money instead of borrowing it. Free money, no debt. Try it ' +
    'and watch WHEN it causes trouble — it depends entirely on whether there ' +
    'is spare capacity in the economy.',

  // --- regimes ---
  'GOLDILOCKS': 'Low inflation, low unemployment. Nothing is wrong. The ' +
    'correct move is to do nothing, which is harder than it sounds.',
  'OVERHEATING': 'The economy is running hotter than it can sustain. Prices ' +
    'are rising. Raise rates or tighten spending — and expect it to hurt ' +
    'before it helps.',
  'RECESSION': 'Weak demand, people out of work, prices flat. Both your main ' +
    'levers point the same way: cut rates and spend.',
  'STAGFLATION': 'High prices AND high unemployment together. There is no ' +
    'good answer. Fixing one makes the other worse, so you are choosing who ' +
    'to hurt. Usually caused by a shock that destroys capacity — oil, war, ' +
    'a pandemic.',

  // --- concepts that appear in the why panel and the readouts ---
  'output gap': 'The difference between what the country is making and what ' +
    'it COULD make. Positive means running hot; negative means idle factories ' +
    'and idle people.',
  'capacity': 'The most the country can produce without prices taking off. ' +
    'Set by workers, machines and know-how — not by how much money exists.',
  'neutral': 'The rate that neither speeds the economy up nor slows it down. ' +
    'Below it you are stimulating; above it you are restraining.',
  'pipeline': 'Things you have already done that have not arrived yet. A rate ' +
    'change takes about a year to move jobs and two to move prices. This is ' +
    'the hardest part of the job.',
  'expectations': 'What people THINK inflation will be. It matters more than ' +
    'what it actually is, because people set wages and prices ahead of time.',
  'term': 'Your time in office: eight years, 96 months. Survive it without ' +
    'breaking anything and you are scored on how it went.',
  'seed': 'The number that decides which random shocks happen. Restart with ' +
    'the same seed and you face an identical world — so you can test a ' +
    'different policy against the same run of luck.',
  'ghost': 'Your previous attempt, drawn faintly behind the current line. The ' +
    'only difference between the two runs is what you did.',
};

/** Definition for a label, or undefined. Case-insensitive on the key. */
export function define(term) {
  if (!term) return undefined;
  if (GLOSSARY[term]) return GLOSSARY[term];
  const lower = String(term).toLowerCase();
  const hit = Object.keys(GLOSSARY).find((k) => k.toLowerCase() === lower);
  return hit ? GLOSSARY[hit] : undefined;
}
