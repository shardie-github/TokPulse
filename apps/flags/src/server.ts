/* TokPulse — © Hardonia. MIT. */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import url from 'node:url';
const PORT = process.env.FLAGS_PORT || 3006;
const ORIGIN = process.env.CORS_ORIGIN || '*';
const FILE = process.env.FLAGS_FILE || path.join(process.cwd(), 'private', 'flags.json');
function sec(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
}
function json(res, c, o) {
  sec(res);
  res.writeHead(c, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(o));
}
const server = http.createServer((req, res) => {
  const p = url.parse(req.url, true);
  if (p.pathname === '/healthz') return json(res, 200, { ok: true, service: 'flags' });
  if (p.pathname === '/api/flags') {
    try {
      const txt = fs.readFileSync(FILE, 'utf-8');
      return json(res, 200, JSON.parse(txt));
    } catch {
      return json(res, 200, {});
    }
  }
  json(res, 404, { error: 'nf' });
});
server.listen(PORT, () => console.log('Flags :' + PORT));
