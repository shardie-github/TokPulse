import fs from 'node:fs';
import path from 'node:path';
const d = new Date(); const day = d.toISOString().slice(0,10);
const outDir = path.join(process.cwd(), 'reports', 'finance');
fs.mkdirSync(outDir, { recursive: true });
const val = (k,def=0)=> (process.env[k] && process.env[k] !== '<TODO>') ? Number(process.env[k]) : def;
// Placeholders; wire to Ads/Shopify later
const adSpend = 0; const revenue = 0; const cogs = revenue * 0.35; const fixed = val('MONTHLY_FIXED_COST',1500)/30;
const profit = revenue - (adSpend + cogs + fixed);
const md = `# Finance Daily — ${day}

- Revenue: $${revenue.toFixed(2)}
- Ad Spend: $${adSpend.toFixed(2)}
- COGS (est 35%): $${cogs.toFixed(2)}
- Fixed (dailyized): $${fixed.toFixed(2)}
- **Profit**: $${profit.toFixed(2)}

## Notes
- Replace placeholders by enabling Shopify/Sheets + Ads tokens.
- File is uploaded as GitHub Actions artifact.
`;
fs.writeFileSync(path.join(outDir, `${day}.md`), md);
