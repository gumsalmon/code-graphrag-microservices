import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.css', ['app.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/data.js', ['data.js', 'text/javascript; charset=utf-8']],
  ['/reasoning-core.js', ['reasoning-core.js', 'text/javascript; charset=utf-8']],
]);

export function createDemoServer() {
  return http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; connect-src 'none'");
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD'); response.writeHead(405); response.end('Read-only viewer'); return;
    }
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    // Exact allowlist: no filesystem traversal or access to repository secrets/source.
    const asset = files.get(url.pathname);
    if (!asset) { response.writeHead(404); response.end('Not found'); return; }
    try {
      const bytes = await readFile(resolve(root, asset[0]));
      response.setHeader('Content-Type', asset[1]);
      response.setHeader('Content-Length', bytes.length);
      response.writeHead(200); response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch {
      response.writeHead(500); response.end('Demo asset missing');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--port')) throw new Error('Usage: node demo/p01/server.mjs [--port 8787]');
  const port = args.length ? Number(args[1]) : 8787;
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid port');
  const server = createDemoServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log('P01 evidence demo: http://127.0.0.1:' + port + ' (recorded evidence; read-only; loopback only)'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
}
