/* TokPulse — © Hardonia. MIT. */
export function applyTheme(t?:'light'|'dark'|'system'){
  const root = document.documentElement
  const pref = t || (localStorage.getItem('tp_theme') as any) || 'system'
  const sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = pref==='dark' || (pref==='system' && sysDark)
  root.classList.toggle('dark', dark)
  localStorage.setItem('tp_theme', pref)
}
export function currentTheme(): 'light'|'dark'|'system' {
  return (localStorage.getItem('tp_theme') as any) || 'system'
}
