import React from 'react'
import { useStore } from '../state/store'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
const COLORS = ['#3b82f6','#22c55e','#a855f7','#f97316','#06b6d4','#eab308']
export const ChannelShareChart = ()=>{
  const s = useStore()
  const data = Object.entries(s.share).map(([name,value])=>({name,value}))
  return (
    <div className="card p-4">
      <div className="font-medium mb-2">Channel Share</div>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={4}>
              {data.map((_,i)=> <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
            </Pie>
            <Tooltip/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
