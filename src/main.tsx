import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AccessGate } from './components/AccessGate.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessGate />
  </StrictMode>,
)
