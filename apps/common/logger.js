import fs from 'node:fs'
import path from 'node:path'
const LOGDIR = process.env.LOG_DIR || path.join(process.cwd(),'var','data')
fs.mkdirSync(LOGDIR,{recursive:true})
function redact(s=''){
  return String(s)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[redacted-email]')
    .replace(/\b\d{12,19}\b/g,'[redacted-number]')
    .replace(/"access_token"\s*:\s*"[^"]+"/gi,'"access_token":"[redacted]"')
}
export function log(file, obj){
  try{
    const line = JSON.stringify({...obj, ts:new Date().toISOString()}, (k,v)=>typeof v==='string'?redact(v):v)
    fs.appendFileSync(path.join(LOGDIR, file), line+'\n')
  }catch{}
}
