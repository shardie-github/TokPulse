import fs from 'node:fs';
import path from 'node:path';
const base = path.join(process.cwd(), 'reports', 'creative');
fs.mkdirSync(base, { recursive: true });
const day = new Date().toISOString().slice(0,10);
const dir = path.join(base, day);
fs.mkdirSync(dir, { recursive: true });
const capcutJson = { version: "1.0", title: `TokPulse Daily ${day}`, tracks: [
  { type: "VOICE", lines: ["SPEAK: Hook: Today’s winning angle.", "SPEAK: Problem, curiosity, reveal.", "SPEAK: CTA: Shop now at hardonia.store."] },
  { type: "OVERLAY", lines: ["ROAS Tracker", "Best CPC Angle", "Limited Stock"] }
]};
const srt = `1
00:00:00,000 --> 00:00:02,500
Today’s winning angle.

2
00:00:02,500 --> 00:00:05,500
Problem, curiosity, reveal.

3
00:00:05,500 --> 00:00:08,000
Shop now at hardonia.store
`;
fs.writeFileSync(path.join(dir, 'capcut.json'), JSON.stringify(capcutJson, null, 2));
fs.writeFileSync(path.join(dir, 'script.srt'), srt);
