import fs from 'node:fs'
const schema = JSON.parse(fs.readFileSync('schemas/report.v1.json','utf-8')) // retained for reference
const reportPath = process.argv[2] || 'packages/data/last-report.json'
function fail(msg){ console.error('report:invalid:', msg); process.exit(1) }
let data
try { data = JSON.parse(fs.readFileSync(reportPath,'utf-8')) } catch(e){ fail('unreadable or invalid JSON') }
const isNum = x => typeof x==='number' && Number.isFinite(x)
const isStr = x => typeof x==='string' && x.length>0
if (!data || data.schema!=='v1') fail('schema must be v1')
if (!Array.isArray(data.kpis)) fail('kpis[] missing')
if (!data.kpis.every(k=>isStr(k.label) && isNum(k.value) && isNum(k.delta))) fail('kpis invalid')
if (!data.share || typeof data.share!=='object') fail('share invalid')
if (!Array.isArray(data.funnel)) fail('funnel invalid')
if (!Array.isArray(data.feed)) fail('feed invalid')
if (!isStr(data.ts)) fail('ts invalid')
console.log('report:ok', reportPath)
