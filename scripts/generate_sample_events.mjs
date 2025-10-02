import fs from 'node:fs'; import path from 'node:path'
const out = path.join(process.cwd(),'var','analytics','events.jsonl'); fs.mkdirSync(path.dirname(out),{recursive:true})
const channels=['tiktok','meta','instagram','youtube','x','shop']
for (let i=0;i<500;i++){
  const ev = { ev:['visit','view','add_to_cart','checkout','purchase'][Math.floor(Math.random()*5)], ch:channels[Math.floor(Math.random()*channels.length)], ts:new Date(Date.now()-Math.random()*7*864e5).toISOString(), v:+(Math.random()*200).toFixed(2) }
  fs.appendFileSync(out, JSON.stringify(ev)+'\n')
}
console.log('wrote sample events ->', out)
