/* TokPulse — © Hardonia. MIT. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'var', 'data');
const FILE = path.join(DATA_DIR, 'meta-ids.jsonl');

export function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '');
}

export function fingerprint(body) {
  return crypto.createHash('sha256').update(body).digest('hex');
}

export function seen(fp) {
  ensureStore();
  // quick contains: scan tail; for MVP we just append and accept O(n) read (low volume)
  const last = fs.readFileSync(FILE, 'utf-8').trim().split('\n').slice(-5000);
  return last.some((line) => {
    try {
      return JSON.parse(line).fp === fp;
    } catch {
      return false;
    }
  });
}

export function remember(fp) {
  ensureStore();
  const rec = JSON.stringify({ ts: new Date().toISOString(), fp }) + '\n';
  fs.appendFileSync(FILE, rec);
}
