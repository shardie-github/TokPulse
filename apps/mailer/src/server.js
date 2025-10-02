import http from 'node:http'
import url from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
const PORT = process.env.MAILER_PORT || 3007
const ORIGIN = process.env.CORS_ORIGIN || '*'
const OUT = path.join(process.cwd(),'var','outbox')
function sec(res){ res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Access-Control-Allow-Origin',ORIGIN); res.setHeader('Access-Control-Allow-Headers','content-type') }
function json(res,c,o){ sec(res); res.writeHead(c,{'Content-Type':'application/json'}); res.end(JSON.stringify(o)) }
const server=http.createServer((req,res)=>{
  const p=url.parse(req.url,true)
  if(req.method==='OPTIONS'){ sec(res); res.writeHead(204); return res.end() }
  if(p.pathname==='/healthz') return json(res,200,{ok:true,service:'mailer'})
  if(req.method==='POST' && p.pathname==='/api/mailer/send'){
    let raw=''; req.on('data',c=>raw+=c); req.on('end',()=>{
      try{
        const {to='',subject='',text='',html=''}=JSON.parse(raw||'{}')
        fs.mkdirSync(OUT,{recursive:true})
        const name=new Date().toISOString().replace(/[:.]/g,'-')+'-'+Math.random().toString(36).slice(2)+'.eml'
        const body = `To: ${to}\nSubject: ${subject}\nContent-Type: text/html; charset=utf-8\n\n${html || `<pre>${text}</pre>`}`
        fs.writeFileSync(path.join(OUT,name), body)
        json(res,200,{ok:true,file:name})
      }catch{ json(res,400,{error:'bad-json'}) }
    }); return
  }
  json(res,404,{error:'nf'})
})
server.listen(PORT, ()=>console.log('Mailer :'+PORT))
