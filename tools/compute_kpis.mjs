import fs from 'node:fs';
import path from 'node:path';
const outDir = path.join(process.cwd(), 'reports', 'intel', 'latest');
fs.mkdirSync(outDir, { recursive: true });
const has = k => !!process.env[k] && process.env[k] !== '<TODO>';
async function fetchTikTok(){ if(!(has('TIKTOK_ADS_ACCESS_TOKEN')&&has('TIKTOK_AD_ACCOUNT_ID'))) return null; return { spend: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0 }; }
async function fetchMeta(){ if(!(has('META_SYSTEM_USER_TOKEN')&&has('META_AD_ACCOUNT_ID'))) return null; return { spend: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0 }; }
function compute(rows){ const x=rows.filter(Boolean); const sum=k=>x.reduce((a,r)=>a+(r[k]||0),0);
  const spend=sum('spend'), clicks=sum('clicks'), imps=sum('impressions'), conv=sum('conversions'), rev=sum('revenue');
  const cpc=clicks?spend/clicks:0, cpm=imps?(spend*1000)/imps:0, cpa=conv?spend/conv:0, roas=spend?rev/spend:0; return {spend,clicks,imps,conv,rev,cpc,cpm,cpa,roas}; }
const main=async()=>{ const tt=await fetchTikTok(); const fb=await fetchMeta(); const k=compute([tt,fb]); const t=new Date().toISOString();
  const md = `# Daily KPI (${t})\n\n| Metric | Value |\n|---|---:|\n| Spend | ${k.spend.toFixed(2)} |\n| Revenue | ${k.rev.toFixed(2)} |\n| ROAS | ${k.roas.toFixed(2)} |\n| CPA | ${k.cpa.toFixed(2)} |\n| CPC | ${k.cpc.toFixed(2)} |\n| CPM | ${k.cpm.toFixed(2)} |\n`;
  fs.writeFileSync(path.join(outDir,'kpi.md'), md);
  fs.writeFileSync(path.join(outDir,'kpi.json'), JSON.stringify({ stamp:t, sources:{tt:!!tt, fb:!!fb}, ...k }, null, 2));
};
main().catch(()=>process.exit(0));
