import prom from "prom-client";
import compression from "compression";
import cron from "node-cron";
import swaggerUi from "swagger-ui-express";
import { randomUUID as uuid } from "crypto";
import pino from "pino";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
/* TokPulse — © Hardonia. MIT. */
const SENTRY_DSN = process.env.SENTRY_DSN || ""; const Sentry = await (async()=>initSentry(SENTRY_DSN))();
async function initSentry(dsn){ if(!dsn) return null; const Sentry=(await import('@sentry/node')).default; Sentry.init({dsn}); return Sentry; }
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

const app = express();
app.use(compression());
app.get("/version", (_req,res)=>res.json({version: process.env.APP_VERSION || "2.0.0", commit: "029ad75", ts: Date.now()}));
const limiter = rateLimit({ windowMs: 60_000, max: 300 });
app.use(limiter);
/* API key gate (optional) */
app.use((req,res,next)=>{
  const allow=(process.env.API_KEYS||"").split(",").filter(Boolean);
  if(allow.length===0) return next();
  const got = req.headers["x-api-key"] || req.query.api_key;
  if(allow.includes(String(got))) return next();
  res.status(401).json({error:"unauthorized"}); });
app.use((req,_res,next)=>{ try{ console.log(req.method, req.url); }catch{} next(); });
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'", "https:"],
      "script-src": ["'self'", "https:", "'unsafe-inline'"],
      "style-src": ["'self'", "https:", "'unsafe-inline'"]
    }
  }
}));
const ALLOW = (process.env.CORS_ALLOW || "http://localhost").split(",");
import cors from "cors";
app.use(cors({ origin: (o,cb)=> cb(null, !o || ALLOW.includes(o)), credentials:true }));
app.use(morgan("combined"));
app.use(express.json());
let tokpulseRequestCount=0;
const metricsMiddleware=(_req,_res,next)=>{ tokpulseRequestCount++; next(); };
app.use(metricsMiddleware);
app.get("/metrics",(_req,res)=>{ res.type("text/plain").send(`tokpulse_requests_total ${tokpulseRequestCount}\n`); });;

app.get("/", (_req,res)=>res.type("text/html").send("<h1>TokPulse</h1>OK"));

const PORT = process.env.PORT || 4000;
(serverRef.srv = app.listen($1))=>console.log("TokPulse web on", PORT));

app.get("/healthz", (_req,res)=>res.json({ok:true,ts:Date.now()}));
app.get("/readyz", (_req,res)=>res.json({ok:true,ts:Date.now()}));


/* graceful shutdown */
const serverRef = { srv: null };
try { const _listenLine = s => {}; } catch(e){}
process.on('SIGINT', ()=>{ try{ console.log("SIGINT"); serverRef.srv?.close?.(()=>process.exit(0)); }catch{} process.exit(0); });
process.on('SIGTERM',()=>{ try{ console.log("SIGTERM"); serverRef.srv?.close?.(()=>process.exit(0)); }catch{} process.exit(0); });

const OPENAPI = {
 "openapi":"3.0.0",
 "info":{"title":"Service API","version":"2.1.0"},
 "paths":{
   "/healthz":{"get":{"responses":{"200":{"description":"ok"}}}},
   "/readyz":{"get":{"responses":{"200":{"description":"ok"}}}},
   "/metrics":{"get":{"responses":{"200":{"description":"metrics"}}}}
 }};
app.use("/docs", swaggerUi.serve, swaggerUi.setup(OPENAPI));

/* simple JSON backup */
import fsPromises from "fs/promises";
app.get("/backupz", async (_req,res)=>{ try {
  await fsPromises.mkdir("./.data", {recursive:true});
  const path = "./.data/backup_"+Date.now()+".json";
  await fsPromises.writeFile(path, JSON.stringify({ts:Date.now(), ok:true}));
  res.json({ok:true, path});
} catch(e){ res.status(500).json({error:String(e)}) }});

cron.schedule("*/10 * * * *", ()=>{ try { console.log("heartbeat", Date.now()); } catch {} });

app.get("/report.json", (_req,res)=>res.json({rows:[{id:1,status:"ok"}], ts:Date.now()}));


/* v2.4.0 — Privacy export */
app.get("/privacy/export", (req,res)=>{
  res.json({ ok:true, job:"export", id:Date.now() });
});


/* v2.4.0 — Privacy erase */
app.post("/privacy/erase", (req,res)=>{
  res.json({ ok:true, job:"erase", id:Date.now() });
});


/* v2.5.0 — CSV download */
app.get("/download/report.csv", (_req,res)=>{
  res.set("Content-Type","text/csv");
  res.send("id,date,type,status
SB-1001,2025-01-10,RFP,New
");
});


/* v2.5.0 — whoami */
app.get("/whoami", (req,res)=>{
  res.json({ ip:req.headers["x-forwarded-for"]||req.socket.remoteAddress, ua:req.headers["user-agent"]||null });
});


/* v2.5.0: slack-modal-enabled */


const registry = new prom.Registry();
prom.collectDefaultMetrics({ register: registry });



// request-logger-mw
app.use((req,res,next)=>{
  const t = Date.now();
  res.on('finish', ()=>{
    const ms = Date.now()-t;
    try { console.log(`${req.method} ${req.url} ${res.statusCode} ${ms}ms`); } catch {}
  });
  next();
});



// rateLimitBasic (env-gated)
const reqCount = new Map();
app.use((req,res,next)=>{
  const windowMs = Number(process.env.RL_WINDOW_MS||60000);
  const max = Number(process.env.RL_MAX||600);
  const key = req.ip || 'x';
  const now = Date.now();
  let e = reqCount.get(key)||{t:now,c:0};
  if(now - e.t > windowMs){ e = {t:now, c:0}; }
  e.c++; reqCount.set(key,e);
  if (process.env.RL_ON==="1" && e.c>max) return res.status(429).json({ok:false, rate_limited:true});
  next();
});



app.get("/status", async (_req,res)=>{
  const metrics = await (async()=>{ try { return await registry.metrics(); } catch { return ""; }})();
  res.type("text/plain").send("ok\n"+metrics.slice(0,1024));
});

