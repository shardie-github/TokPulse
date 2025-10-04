/* TokPulse — © Hardonia. MIT. */
import { hasConsent } from '../components/CookieConsent'
export async function track(ev:string, props:any={}){
  try{
    if (typeof window!=='undefined' && !hasConsent()) return
    await fetch('/api/analytics/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ev,props,ts:new Date().toISOString()})})
  }catch{}
}
