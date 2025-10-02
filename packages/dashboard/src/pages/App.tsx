import React from 'react'
import { Sidebar } from '../components/Sidebar'
import { Topbar } from '../components/Topbar'
import { KPIsGrid } from '../components/KPIsGrid'
import { ChannelShareChart } from '../components/ChannelShareChart'
import { FunnelChart } from '../components/FunnelChart'
import { ActivityFeed } from '../components/ActivityFeed'
import { MediaWidget } from '../components/MediaWidget'
import { Leaderboard } from '../components/Leaderboard'
import { StreakWidget } from '../components/StreakWidget'
import { XPBar } from '../components/XPBar'
import { SettingsDrawer } from '../components/SettingsDrawer'
import { SupportWidget } from '../components/SupportWidget'
import { fetchReport } from '../lib/data.ts'
import { useStore } from '../state/store'

export default function App(){
  React.useEffect(()=>{(async()=>{
    const r = await fetchReport(); if(!r) return;
    const S = useStore.getState();
    S.kpis=r.kpis; (S as any).funnel=r.funnel; (S as any).feed=r.feed; (S as any).share=r.share;
  })()},[])
  return (
    <div className="min-h-screen grid md:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
      <aside className="hidden md:block"><Sidebar/></aside>
      <main className="p-4 md:p-6 lg:p-8 space-y-6">
        <Topbar/>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          <section className="xl:col-span-2 space-y-6">
            <KPIsGrid/>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChannelShareChart/>
              <FunnelChart/>
            </div>
            <ActivityFeed/>
          </section>
          <section className="space-y-6">
            <MediaWidget/>
            <Leaderboard/>
            <StreakWidget/>
            <XPBar/>
            <SettingsDrawer/>
          </section>
        </div>
      </main>
      <SupportWidget/>
    </div>
  )
}
