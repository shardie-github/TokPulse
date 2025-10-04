/* TokPulse — © Hardonia. MIT. */
export type KPI = { label:string; value:number; delta:number; unit?:string }
export type ReportV1 = {
  schema:'v1'
  kpis: KPI[]
  share: Record<string, number>
  funnel: { stage:string; value:number }[]
  feed: { ts:string; channel:string; title:string; details?:string }[]
  ts: string
}
export async function fetchReport(): Promise<ReportV1|null> {
  try{
    const res = await fetch('/api/report', {cache:'no-store'})
    if (!res.ok) return null
    const j = await res.json()
    return j?.schema === 'v1' ? (j as ReportV1) : null
  } catch { return null }
}
