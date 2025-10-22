/* TokPulse — © Hardonia. MIT. */
import fs from "fs"; import path from "path";
const ALLOW = new Set([".js",".ts",".md",".html",".yml",".yaml"]);
function walk(d){
  for (const e of fs.readdirSync(d,{withFileTypes:true})) {
    if (["node_modules",".git",".data","dist","logs"].includes(e.name)) continue;
    const p = path.join(d,e.name);
    if (e.isDirectory()) { walk(p); continue; }
    const ext = path.extname(p).toLowerCase();
    if (!ALLOW.has(ext)) continue;
    try {
      let s = fs.readFileSync(p, "utf8");
      if (!s.startsWith("/* ") && !s.startsWith("<!doctype") && !s.startsWith("#!")) {
        fs.writeFileSync(p, "/* TokPulse — © Hardonia. MIT. */\n" + s, "utf8");
      }
    } catch {}
  }
}
walk(process.cwd()); console.log("header applied");
