import { create } from 'zustand'
type Channel = 'tiktok'|'meta'|'youtube'|'x'|'instagram'|'shop'
type KPI = { label:string; value:number; delta:number; unit?:string }
type Activity = { ts:string; channel:Channel; title:string; details?:string }
type Badge = { id:string; name:string; desc:string; earned:boolean; icon?:string; xp:number }

type State = {
  theme:'light'|'dark',
  kpis: KPI[],
  share: Record<Channel, number>,
  funnel: { stage:string; value:number }[],
  feed: Activity[],
  xp:number,
  streak:number,
  badges: Badge[],
  leaderboard: { user:string; xp:number }[],
  setTheme:(t:'light'|'dark')=>void
}

export const useStore = create<State>((set)=>({
  theme:'dark',
  kpis:[
    {label:'Revenue', value:128430, delta:12.4, unit:'$'},
    {label:'Orders', value:1780, delta:7.8},
    {label:'Conv. Rate', value:3.7, delta:0.3, unit:'%'},
    {label:'Avg. Order', value:72.1, delta:1.1, unit:'$'}
  ],
  share:{ tiktok:42, meta:31, instagram:12, youtube:9, x:3, shop:3 },
  funnel:[
    {stage:'Visits', value:42000},
    {stage:'Product Views', value:18000},
    {stage:'Adds to Cart', value:5600},
    {stage:'Checkouts', value:2200},
    {stage:'Purchases', value:1780}
  ],
  feed:[
    {ts:new Date().toISOString(), channel:'tiktok', title:'Spark Ad boosted', details:'+14% CTR'},
    {ts:new Date().toISOString(), channel:'meta', title:'New catalog synced'},
    {ts:new Date().toISOString(), channel:'shop', title:'Order #12031 placed', details:'$184.22'}
  ],
  xp: 1320,
  streak: 6,
  badges: [
    {id:'onboarded', name:'Onboarded', desc:'Completed setup', earned:true, xp:50},
    {id:'first100', name:'First 100 Orders', desc:'Hit 100 sales', earned:true, xp:150},
    {id:'retention', name:'Retention Pro', desc:'7-day repeat rate > 15%', earned:false, xp:300}
  ],
  leaderboard:[
    {user:'You', xp:1320},
    {user:'@ops-team', xp:980},
    {user:'@creative', xp:720}
  ],
  setTheme:(t)=>set({theme:t})
}))
