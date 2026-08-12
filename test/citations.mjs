/**
 * DECLARED CITATIONS — the tripwire for a number re-typed into prose
 * [4th audit 5.12, open_items E4].
 *
 * Not a test file — `node --test test/*.test.js` will not pick it up.
 *
 * WHY THIS IS NOT A SWEEP. Every generated artefact in this project has a
 * `--check` and every number re-typed into a sentence had none, and prose has
 * no schema to check against. The two obvious sweeps were measured before
 * anything was built and both are dead ends (open_items E4):
 *
 *   - `PARAM_NAME` followed by a number, across all of docs/: 97 sites, 55
 *     disagreements, almost all of them month numbers (`TAYLOR_INFLATION` …
 *     48 is "at m48") or dated artefacts that docs/README explicitly allows to
 *     describe the past. A checker that fires 55 times on a clean tree trains
 *     you to ignore it, which is worse than no checker;
 *   - the same, tightened to the living documents: ONE site, and it agrees.
 *
 * The heuristic finds nothing because the class that actually goes stale is
 * not parameter values — it is MEASURED QUANTITIES, and none of them sits next
 * to a parameter name. The transmitted Taylor response, the UK sacrifice
 * ratio, `TAX_SHOCK_TO_GDP`'s model value: each is produced by a test and then
 * written out by hand somewhere else, and it is the copy that rots.
 *
 * SO THE CITATION IS DECLARED RATHER THAN GUESSED. The test that measures a
 * quantity names the places that quote it, and asserts they say what it just
 * measured. No heuristic, no false positives, and the register doubles as the
 * answer to "who repeats this number?" — which nobody could previously answer,
 * which is why 3.1 moved the Taylor response and two documents kept the old
 * one through a hard gate.
 *
 * THE ANCHOR MUST SHARE A LINE WITH THE NUMBER. That is the convention 5.12
 * exists to impose, and it is the same one docs/11's cell check imposes on
 * tables: a number is checkable when something beside it says what it is. A
 * bare number in prose is not checkable by anything and should not be written.
 *
 * ASK THE STANDING QUESTION. What would have to be true for this to pass while
 * a document is stale? The anchor would have to stop matching — so a missing
 * anchor is a FAILURE, not a skip, and it is reported as loudly as a wrong
 * number. A citation that quietly stops being checked is the defect this file
 * is a response to.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);

/**
 * Assert that every declared citation of a measurement is current.
 *
 * @param {string} label  what the quantity is, for the failure message
 * @param {string} text   the value, formatted exactly as prose writes it
 * @param {{file: string, near: RegExp, what?: string}[]} sites
 *        `near` must match a line that CONTAINS the number.
 */
export function citedIn(label, text, sites) {
  const problems = [];
  for (const { file, near, what } of sites) {
    let lines;
    try {
      lines = readFileSync(new URL(file, ROOT), 'utf8').split('\n');
    } catch {
      problems.push(`${file} — the file does not exist, so the citation cannot be checked`);
      continue;
    }
    const hits = lines
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => near.test(line));

    if (hits.length === 0) {
      problems.push(
        `${file} — nothing matches ${near}, so this citation is no longer checked ` +
        `by anything. Either the text moved (re-point the anchor) or the citation ` +
        `was deleted (drop it from the register). Do not leave it silent.`);
      continue;
    }
    const stale = hits.filter(({ line }) => !line.includes(text));
    if (stale.length === hits.length) {
      problems.push(
        `${file}:${stale[0].n} does not say ${text}${what ? ` (${what})` : ''}:\n` +
        stale.slice(0, 3).map(({ line, n }) => `        ${n}: ${line.trim().slice(0, 120)}`).join('\n'));
    }
  }
  assert.deepEqual(problems, [],
    `${label} measures ${text} now, and these places still say something else.\n` +
    `      A number this project has measured lives in more than one document, and the\n` +
    `      copy is what rots — docs/02 and TAYLOR_INFLATION's note both carried a stale\n` +
    `      transmitted Taylor response through a hard gate whose job was to re-measure\n` +
    `      everything. Update the prose, do not widen this test.\n\n` +
    problems.map((p) => `      ${p}`).join('\n') + '\n');
}
