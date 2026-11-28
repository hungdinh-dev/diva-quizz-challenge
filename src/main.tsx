import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
// survey.css first so Tailwind utilities (in index.css) can override its component classes
import './survey.css'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
