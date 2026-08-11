/**
 * BUILD  src/  ->  index.html
 * ===========================
 * A concatenator, not a bundler. No dependencies, no transpiling, no
 * node_modules. It exists so you can work in real files instead of one
 * 3,000-line document.
 *
 *     node tools/build.mjs        (or: npm run build)
 *
 * HOW IT WORKS
 *   Source files are real ES modules, so `node --test` can import them
 *   directly. For the browser bundle this script concatenates them in
 *   BUILD_ORDER and strips the import/export keywords, which works because
 *   everything ends up in one scope.
 *
 * THE HOUSE RULES THAT MAKE THAT SAFE  (enforced below — build fails loudly)
 *   1. `import` statements sit at the top of the file, one per line.
 *   2. No default exports. Named only: `export function`, `export const`.
 *   3. No `export { ... }` blocks and no re-exports.
 *   4. No dynamic `import()`.
 *   5. Every top-level name is unique across the whole project. One scope.
 *
 * If you need something these rules forbid, change the rules here rather than
 * working around them in a source file — a silent bundling bug is far more
 * expensive than a strict build.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Concatenation order. Dependencies first. Add new files here. */
const BUILD_ORDER = [
  'src/params.js',        // generated
  'src/units.js',
  'src/rng.js',
  'src/kernels.js',
  'src/trace.js',
  'src/state.js',
  'src/lags.js',
  'src/invariants.js',

  'src/rules/supply.js',
  'src/rules/consumption.js',
  'src/rules/investment.js',
  'src/rules/aggregate.js',
  'src/rules/labour.js',
  'src/rules/wages.js',
  'src/rules/prices.js',
  'src/rules/money.js',
  'src/rules/credit.js',
  'src/rules/fiscal.js',
  'src/rules/crisis.js',
  'src/rules/sentiment.js',
  'src/rules/index.js',

  'src/engine.js',

  'src/game/glossary.js',
  'src/game/scenarios.js',
  'src/game/autopilot.js',
  'src/game/dials.js',
  'src/game/events.js',
  'src/game/endings.js',
  'src/game/indicators.js',
  'src/game/clock.js',
  'src/game/session.js',

  'src/ui/chart.js',
  'src/ui/widgets/tooltip.js',
  'src/ui/widgets/transport.js',
  'src/ui/widgets/gameover.js',
  'src/ui/widgets/gauge.js',
  'src/ui/widgets/dial.js',
  'src/ui/widgets/pipeline.js',
  'src/ui/widgets/regime.js',
  'src/ui/widgets/why.js',
  'src/ui/app.js',
];

const IMPORT_RE = /^\s*import\s.*?;?\s*$/gm;
const EXPORT_RE = /^\s*export\s+(?=(?:async\s+)?(?:function|const|let|class))/gm;

function check(path, src) {
  const problems = [];
  if (/^\s*export\s+default/m.test(src)) problems.push('default export (rule 2)');
  if (/^\s*export\s*\{/m.test(src)) problems.push('export { } block (rule 3)');
  if (/^\s*export\s+\*/m.test(src)) problems.push('re-export (rule 3)');
  if (/[^.\w]import\s*\(/.test(src)) problems.push('dynamic import() (rule 4)');
  if (problems.length) {
    console.error(`\n  BUILD FAILED — ${path}`);
    for (const p of problems) console.error(`    - ${p}`);
    console.error('\n  See the house rules at the top of tools/build.mjs.\n');
    process.exit(1);
  }
}

const missing = BUILD_ORDER.filter((f) => !existsSync(join(ROOT, f)));
if (missing.length) {
  console.error('\n  BUILD FAILED — files in BUILD_ORDER do not exist:');
  for (const m of missing) console.error(`    - ${m}`);
  console.error('\n  Create them, or remove them from BUILD_ORDER in tools/build.mjs.\n');
  process.exit(1);
}

const seen = new Map();
const chunks = [];
for (const rel of BUILD_ORDER) {
  const src = readFileSync(join(ROOT, rel), 'utf8');
  check(rel, src);

  // Rule 5: one scope, so top-level names must be globally unique.
  // TOP-LEVEL only: no leading whitespace. Matching indented declarations
  // flags every `const age` inside a function body as a collision.
  for (const m of src.matchAll(/^(?:export\s+)?(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    const name = m[1];
    if (seen.has(name)) {
      console.error(`\n  BUILD FAILED — duplicate top-level name '${name}'`);
      console.error(`    first in ${seen.get(name)}`);
      console.error(`    again in ${rel}`);
      console.error('\n  Everything shares one scope in the bundle (rule 5). Rename one.\n');
      process.exit(1);
    }
    seen.set(name, rel);
  }

  chunks.push(
    `\n// ${'='.repeat(66)}\n// ${rel}\n// ${'='.repeat(66)}\n` +
    src.replace(IMPORT_RE, '').replace(EXPORT_RE, '')
  );
}

const css = existsSync(join(ROOT, 'src/ui/styles.css'))
  ? readFileSync(join(ROOT, 'src/ui/styles.css'), 'utf8') : '';
const shell = readFileSync(join(ROOT, 'src/ui/shell.html'), 'utf8');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Crash — a real-time economy simulator</title>
<style>
${css}
</style>
</head>
<body>
${shell}
<script>
"use strict";
${chunks.join('\n')}
</script>
</body>
</html>
`;

const OUT = join(ROOT, 'index.html');
const kb = (Buffer.byteLength(html) / 1024).toFixed(1);

/**
 * --check: verify index.html matches src/ and write nothing.
 *
 * index.html is generated and gitignored, so it is never stale in the repo —
 * but it is stale on disk the moment you edit src/ without rebuilding, and
 * `test/bundle.test.js` RUNS IT. That test is the only one that exercises the
 * real deliverable rather than the ES modules, and against a stale bundle it
 * happily passes on code that no longer exists: the one test written to catch
 * what the module tests cannot see, reporting on last week's model.
 *
 * Measured during the fourth audit: after three commits of Phase 1 changes to
 * src/game/autopilot.js, the on-disk bundle still contained the pre-audit
 * autopilot, and `npm test` was green.
 *
 * This is a tripwire rather than an implicit rebuild on purpose. `npm test`
 * must not rewrite a 352 kB file as a side effect — a test command that
 * mutates the working tree is its own kind of surprise. `npm run build` fixes
 * it, and the message says so.
 */
if (process.argv.includes('--check')) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null;
  if (current !== html) {
    console.error(
      `\nbuild: index.html is STALE — it does not match src/.\n\n` +
      `  index.html is the deliverable and it is committed, so a stale one ` +
      `ships the\n  old model while passing every test in the suite. Run ` +
      `\`npm run build\`.\n`);
    process.exit(1);
  }
  console.log(`build: index.html is current (${BUILD_ORDER.length} modules, ${kb} kB)`);
} else {
  writeFileSync(OUT, html);
  console.log(`wrote index.html — ${BUILD_ORDER.length} modules, ${seen.size} top-level names, ${kb} kB`);
}
