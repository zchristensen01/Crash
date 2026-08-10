/**
 * BUNDLE SMOKE TEST — runs the actual deliverable.
 *
 * Every other test imports ES modules. The thing a user opens is index.html,
 * where those modules have been concatenated with their imports stripped into
 * a single shared scope. That transformation can break in ways the module
 * tests cannot see: a name collision, a const referenced before its line, a
 * file missing from BUILD_ORDER. This runs the real bundle.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { installDOM } from './dom-shim.mjs';

const BUILT = 'index.html';

test('index.html has been built', () => {
  assert.ok(existsSync(BUILT), 'run `npm run build` first');
});

test('the bundled page executes without throwing', () => {
  const html = readFileSync(BUILT, 'utf8');
  const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script>'));
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));

  installDOM(body);
  assert.doesNotThrow(() => {
    // eslint-disable-next-line no-new-func
    new Function(script)();
  });

  // It booted: the gauges are on the page.
  assert.ok(document.querySelector('#gauges').children.length > 0,
    'the bundle ran but mounted no gauges');
  assert.ok(document.querySelector('#dials').children.length > 0,
    'the bundle ran but mounted no dials');
});

test('no import or export keyword survived into the bundle', () => {
  const html = readFileSync(BUILT, 'utf8');
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  assert.ok(!/^\s*import\s/m.test(script), 'an import statement leaked into the bundle');
  assert.ok(!/^\s*export\s/m.test(script), 'an export keyword leaked into the bundle');
});

test('the page is self-contained — no external requests', () => {
  // A strict CSP blocks every external host. One CDN link and the page is
  // blank for anyone who opens it offline or from a file:// URL.
  const html = readFileSync(BUILT, 'utf8');
  assert.ok(!/<script[^>]+src=/i.test(html), 'external script tag');
  assert.ok(!/<link[^>]+rel=["']?stylesheet/i.test(html), 'external stylesheet');
  assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(html.replace(/<!--[\s\S]*?-->/g, '')),
    'an absolute URL is referenced');
});
