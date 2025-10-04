/* TokPulse — © Hardonia. MIT. */
import fs from "fs"; import path from "path";
const SKIP = new Set(["node_modules",".git",".data","dist","logs"]);
function walk(d){ for(const e of fs.readdirSync(d,{withFileTypes:true})){
  if (SKIP.has(e.name)) continue; const p=path.join(d,e.name);
  if (e.isDirectory()) walk(p); else { try { let s=fs.readFileSync(p,"utf8"); s=s.replace(/\r\n/g,"\n"); fs.writeFileSync(p,s,"utf8"); } catch{} }
}} walk(process.cwd()); console.log("sanitize done");
