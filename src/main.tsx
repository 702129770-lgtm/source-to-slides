import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './styles/tokens.css'
import './styles/global.css'
import './styles/wizard.css'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
