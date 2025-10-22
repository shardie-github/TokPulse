/* TokPulse — © Hardonia. MIT. */
import http from 'node:http';
import url from 'node:url';
import crypto from 'node:crypto';
import { log } from './lib/logger.js';
import { fingerprint, seen, remember } from './lib/idempotency.js';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || '';
const APP_SECRET   = process.env.META_APP_SECRET || '';

function verifySignature(req, raw) {
  if (!APP_SECRET) return false;
  const sig = req.headers['x-hub-signature-256'];
  if (!sig || !sig.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', APP_SECRET).update(raw).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig.slice(7)), Buffer.from(expected));
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

  // Health/readiness
  if (req.method === 'GET' && parsed.pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, service: 'meta-webhook' }));
  }

  // Verify token handshake
  if (req.method === 'GET' && parsed.pathname === '/webhook') {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': chal } = parsed.query;
    const ok = mode === 'subscribe' && token === VERIFY_TOKEN && chal;
    log('meta.verify', { ok, mode, hasToken: !!token });
    res.writeHead(ok ? 200 : 403, { 'Content-Type': 'text/plain' });
    return res.end(ok ? String(chal) : 'Forbidden');
  }

  // Receive events
  if (req.method === 'POST' && parsed.pathname === '/webhook') {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 5_000_000) req.destroy(); });
    req.on('end', () => {
      const fp = fingerprint(raw);
      if (!verifySignature(req, raw)) {
        log('meta.bad_signature', { fp });
        res.writeHead(401); return res.end('Invalid signature');
      }
      if (seen(fp)) {
        log('meta.duplicate', { fp });
        res.writeHead(200); return res.end('OK (duplicate)');
      }
      remember(fp);

      let json = null;
      try { json = JSON.parse(raw); } catch { json = { _raw: raw.slice(0, 2048) }; }
      log('meta.event', { fp, length: raw.length, summary: (json?.entry?.[0]?.changes?.[0]?.field) ?? 'n/a' });

      // TODO: enqueue → process → map to TikTok parity signals (ViewContent, AddToCart, Purchase)
      res.writeHead(200); return res.end('OK');
    });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => log('meta.start', { port: PORT }));
