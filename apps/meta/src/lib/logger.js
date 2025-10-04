/* TokPulse — © Hardonia. MIT. */
import fs from 'node:fs';
import path from 'node:path';

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'var', 'log');
const FILE = path.join(LOG_DIR, 'meta.jsonl');

export function log(event, data = {}) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), event, ...data }) + '\n';
    fs.appendFileSync(FILE, line);
  } catch (e) {
    console.error('log-fail', e?.message);
  }
}
