/**
 * PRODUCER / CONSUMER GRAPH for the 24 rules, by static analysis of src/rules/.
 * Flags every field a rule READS whose PRODUCER runs LATER in the same tick.
 */
import fs from 'node:fs';
const R = new URL('../../src/rules/', import.meta.url).pathname;

// Derived from src/rules/index.js so a reorder cannot silently desync this
// from the model. The file lists the rules in execution order.
const FILES = { updatePotentialOutput: 'supply.js', updateCrisisRecovery: 'crisis.js',
  updateConsumption: 'consumption.js', updateInvestment: 'investment.js',
  aggregateDemand: 'aggregate.js', updateEmployment: 'labour.js',
  updateWages: 'wages.js', updateVelocity: 'money.js', updateMonetisation: 'money.js',
  updateInflation: 'prices.js', updateExpectations: 'prices.js',
  updateCredibility: 'prices.js', updateDefaults: 'credit.js',
  updateCreditGap: 'credit.js', updateAssetPrices: 'credit.js',
  updateLeverage: 'credit.js', updateCreditSpread: 'credit.js',
  updateCrisisRisk: 'credit.js', updateBondYield: 'fiscal.js',
  updateAutoStabilisers: 'fiscal.js', updateBudget: 'fiscal.js',
  updateConfidence: 'sentiment.js', updateApproval: 'sentiment.js' };
const { RULES } = await import('../../src/rules/index.js');
const ORDER = RULES.map((fn) => [fn.name, FILES[fn.name]]);
for (const [name, file] of ORDER) if (!file) throw new Error(`add ${name} to FILES`);

const cache = {};
function body(file, fn) {
  const src = cache[file] ??= fs.readFileSync(R + file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const i = src.indexOf(`function ${fn}(`);
  if (i < 0) throw new Error('not found ' + fn);
  let d = 0, j = src.indexOf('{', i), k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) break; }
  }
  return src.slice(j, k + 1);
}

const writes = {}, reads = {};
for (const [fn, file] of ORDER) {
  const b = body(file, fn);
  const w = new Set([...b.matchAll(/\bs\.([A-Za-z_][\w]*)\s*(?:\+|-|\*|\/)?=(?!=)/g)].map((m) => m[1]));
  const r = new Set([...b.matchAll(/\bs\.([A-Za-z_][\w]*)/g)].map((m) => m[1]));
  // a compound assignment (x += ...) is both a read and a write
  for (const m of b.matchAll(/\bs\.([A-Za-z_][\w]*)\s*=(?!=)/g)) {
    // pure assignment: remove from reads only if it never appears on a RHS
    const name = m[1];
    const rhsUse = new RegExp(`s\\.${name}\\b(?!\\s*=(?!=))`).test(b);
    if (!rhsUse) r.delete(name);
  }
  writes[fn] = w; reads[fn] = r;
}

const idx = Object.fromEntries(ORDER.map(([fn], i) => [fn, i]));
const producer = {};
for (const [fn] of ORDER) for (const w of writes[fn]) (producer[w] ??= []).push(fn);

console.log('=== STALE READS: rule reads X, but X is (re)written by a LATER rule this tick ===\n');
const stale = [];
for (const [fn] of ORDER) {
  for (const v of reads[fn]) {
    const prods = producer[v] || [];
    const later = prods.filter((p) => idx[p] > idx[fn]);
    const earlier = prods.filter((p) => idx[p] <= idx[fn]);
    if (later.length && !earlier.length) {
      stale.push({ rule: `${idx[fn] + 1}. ${fn}`, reads: v,
        'value seen': 'LAST tick', 'written later by': later.map((p) => `${idx[p] + 1}.${p}`).join(', ') });
    }
  }
}
console.table(stale);

console.log('\n=== fields WRITTEN by a rule and READ BY NO RULE (dead within the model) ===');
const readers = {};
for (const [fn] of ORDER) for (const v of reads[fn]) (readers[v] ??= []).push(fn);
const dead = Object.keys(producer).filter((v) => !(readers[v]?.length));
console.log('  ' + dead.sort().join('\n  '));

console.log('\n=== fields READ by a rule that NO rule ever writes (must come from newState/params/dials) ===');
const orphan = [...new Set(Object.values(reads).flatMap((s) => [...s]))]
  .filter((v) => !producer[v]);
console.log('  ' + orphan.sort().join(', '));
