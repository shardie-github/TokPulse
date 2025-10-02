import React from 'react'
export default class ErrorBoundary extends React.Component<{children:React.ReactNode},{err?:any}>{
  state={err:undefined as any}
  static getDerivedStateFromError(err:any){ return {err} }
  componentDidCatch(err:any,info:any){ console.error('UI error',err,info) }
  render(){
    if(this.state.err){ return <div className="card p-6 border-2 border-red-500/40">Something went wrong. Please refresh — we’ve logged the error.</div> }
    return this.props.children as any
  }
}
