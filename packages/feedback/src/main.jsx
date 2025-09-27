import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './pages/App'
import Admin from './pages/Admin'

const root = document.getElementById('root')
const path = location.pathname
createRoot(root).render(path.startsWith('/admin') ? <Admin/> : <App/>)
