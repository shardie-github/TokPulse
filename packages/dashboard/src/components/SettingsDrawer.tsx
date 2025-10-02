import React from 'react'
import { useStore } from '../state/store'
export const SettingsDrawer = ()=>{
  const theme = useStore(s=>s.theme)
  return (
    <div className="card p-4 space-y-2">
      <div className="font-medium">Settings</div>
      <div className="text-xs opacity-70">Theme: <span className="font-mono">{theme}</span></div>
      <div className="text-xs opacity-70">Connections: TikTok, Meta, Shop</div>
      <div className="text-xs opacity-70">Tip: Earn XP by completing checklists.</div>
    </div>
  )
}
