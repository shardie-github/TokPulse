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

export default function App(){
  return (
    <div className="min-h-screen grid md:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
      <aside className="hidden md:block"><Sidebar/></aside>
      <main className="p-4 md:p-6 lg:p-8 space-y-6">
        <Topbar/>
        <div className="grid-gap grid grid-cols-1 xl:grid-cols-3">
          <section className="xl:col-span-2 space-y-6">
            <KPIsGrid/>
            <div className="grid-gap grid grid-cols-1 lg:grid-cols-2">
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
    </div>
  )
}
