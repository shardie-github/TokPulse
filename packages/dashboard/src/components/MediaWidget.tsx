import React from 'react'
export const MediaWidget = ()=>{
  return (
    <div className="card p-3">
      <div className="font-medium mb-2">Media & Creatives</div>
      <div className="aspect-video rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 flex items-center justify-center">
        <div className="text-xs opacity-70 px-3 text-center">
          Drop platform embeds or uploads here (TikTok/IG/YouTube).
        </div>
      </div>
    </div>
  )
}
