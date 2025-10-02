export function idle(cb:()=>void){ ('requestIdleCallback' in window ? (window as any).requestIdleCallback(cb) : setTimeout(cb,300)) }
export function prefetchChunks(){
  idle(async ()=>{
    try{
      await Promise.allSettled([
        import('../components/Leaderboard'),
        import('../components/SupportWidget'),
        import('../components/FunnelChart'),
        import('../components/ChannelShareChart'),
        import('../components/ActivityFeed'),
      ])
    }catch{}
  })
}
