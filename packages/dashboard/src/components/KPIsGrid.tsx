import React from 'react'
import { useStore } from '../state/store'
const Kpi = ({label,value,delta,unit}:{label:string,value:number,delta:number,unit?:string})=>(
  <div className="card p-4">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="flex items-end gap-2">
      <div className="text-2xl font-semibold">{unit==='$'? '$'+value.toLocaleString(): unit==='%'? value.toFixed(1)+'%': value.toLocaleString()}</div>
      <div className={delta>=0?'text-emerald-500':'text-rose-500'}>{delta>=0? '+' : ''}{delta}{unit==='%'?'%':''}</div>
    </div>
  </div>
)
export const KPIsGrid = ()=>{
  const kpis = useStore(s=>s.kpis)
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{kpis.map((k)=> <Kpi key={k.label} {...k}/>)}</div>
}
