/**
 * A static file server, ~30 lines, no dependencies.
 *
 * index.html is fully self-contained and opens fine from a file:// URL, so
 * this is a convenience rather than a requirement — useful when you want to
 * hit it from another device on the network, or from Windows against a WSL
 * checkout.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const PORT = Number(process.env.PORT || 8123);
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
                '.json': 'application/json', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const rel = normalize(decodeURIComponent(req.url.split('?')[0]));
  const path = join(ROOT, rel === '/' ? 'index.html' : rel);
  if (!path.startsWith(ROOT)) { res.writeHead(403).end('nope'); return; }
  try {
    const body = await readFile(path);
    res.writeHead(200, {
      'content-type': TYPES[extname(path)] || 'application/octet-stream',
      'cache-control': 'no-store',
    }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, () => {
  console.log(`\n  CRASH is running at  http://localhost:${PORT}\n`);
  console.log('  Ctrl-C to stop. Re-run `npm run build` after editing src/.\n');
});
