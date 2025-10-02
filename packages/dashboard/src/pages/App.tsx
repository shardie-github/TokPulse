import React from 'react'
import { registerPWA } from '../lib/pwa'
import { Sidebar } from '../components/Sidebar'
import { Topbar } from '../components/Topbar'
import { KPIsGrid } from '../components/KPIsGrid'
import { fetchReport } from '../lib/data.ts'
import { useStore } from '../state/store'

// Lazy chunks for heavier widgets
const ChannelShareChart = React.lazy(() => import('../components/ChannelShareChart'))
const FunnelChart       = React.lazy(() => import('../components/FunnelChart'))
const ActivityFeed      = React.lazy(() => import('../components/ActivityFeed'))
const MediaWidget       = React.lazy(() => import('../components/MediaWidget'))
const Leaderboard       = React.lazy(() => import('../components/Leaderboard'))
const StreakWidget      = React.lazy(() => import('../components/StreakWidget'))
const XPBar             = React.lazy(() => import('../components/XPBar'))
const ProPanel = React.lazy(() => import('../components/ProPanel'));
const CommandPalette    = React.lazy(() => import('../components/CommandPalette'))
const TrialBanner       = React.lazy(() => import('../components/TrialBanner'))
const ExportButton      = React.lazy(() => import('../components/ExportButton'))
const SettingsDrawer    = React.lazy(() => import('../components/SettingsDrawer'))
const SupportWidget     = React.lazy(() => import('../components/SupportWidget'))

export default function App(){
  React.useEffect(()=>{ registerPWA() },[])
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
        
        <React.Suspense fallback={<div className='card p-3'>Loading…</div>}><TrialBanner/></React.Suspense>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          <section className="xl:col-span-2 space-y-6">
            <KPIsGrid/>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <React.Suspense fallback={<div className="card p-4">Loading…</div>}><ChannelShareChart/></React.Suspense>
              <React.Suspense fallback={<div className="card p-4">Loading…</div>}><FunnelChart/></React.Suspense>
            </div>
            <React.Suspense fallback={<div className="card p-4">Loading…</div>}><ActivityFeed/></React.Suspense>
          </section>
          <section className="space-y-6">
            <React.Suspense fallback={<div className="card p-4">Loading…</div>}><MediaWidget/></React.Suspense>
            <React.Suspense fallback={<div className="card p-4">Loading…</div>}><Leaderboard/></React.Suspense>
            <React.Suspense fallback={<div className="card p-4">Loading…</div>}><StreakWidget/></React.Suspense>
            <React.Suspense fallback={<div className="card p-4">Loading…</div>}><XPBar/></React.Suspense>
            <React.Suspense fallback={<div className="card p-4">Loading…</div>}><React.Suspense fallback={<div className="card p-4">Loading…</div>}><ProPanel/></React.Suspense>
            <SettingsDrawer/></React.Suspense>
          </section>
        </div>
        <React.Suspense fallback={null}><CommandPalette/></React.Suspense>
      </main>
      <React.Suspense fallback={null}><SupportWidget/></React.Suspense>
    </div>
  )
}
