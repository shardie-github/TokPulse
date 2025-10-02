import React from 'react'
import { Home, BarChart3, PlaySquare, ShoppingBag, Settings } from 'lucide-react'
export const Sidebar = () => (
  <div className="h-screen sticky top-0 p-4 space-y-4 bg-white/70 dark:bg-[#0f1530]/60 backdrop-blur border-r border-gray-100/50 dark:border-white/5">
    <div className="text-xl font-bold tracking-tight">TokPulse</div>
    <nav className="space-y-1">
      {[
        {icon:Home, label:'Overview'},
        {icon:BarChart3, label:'Analytics'},
        {icon:PlaySquare, label:'Creatives'},
        {icon:ShoppingBag, label:'Commerce'},
        {icon:Settings, label:'Settings'}
      ].map(({icon:Icon,label})=>(
        <button key={label} className="flex w-full items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100/70 dark:hover:bg-white/10">
          <Icon size={18}/><span>{label}</span>
        </button>
      ))}
    </nav>
    <div className="text-xs text-gray-500 mt-6">v0.1 premium</div>
  </div>
)
