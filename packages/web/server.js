import rateLimit from "express-rate-limit";
/* TokPulse — © Hardonia. MIT. */
const SENTRY_DSN = process.env.SENTRY_DSN || ""; const Sentry = await (async()=>initSentry(SENTRY_DSN))();
async function initSentry(dsn){ if(!dsn) return null; const Sentry=(await import('@sentry/node')).default; Sentry.init({dsn}); return Sentry; }
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

const app = express();
app.get("/version", (_req,res)=>res.json({version: process.env.APP_VERSION || "2.0.0", commit: "029ad75", ts: Date.now()}));
const limiter = rateLimit({ windowMs: 60_000, max: 300 });
app.use(limiter);
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
