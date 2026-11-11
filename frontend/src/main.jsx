import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const applyTheme = () => {
  const saved = localStorage.getItem('theme') || 'system'
  let isDark = false
  if (saved === 'dark') {
    isDark = true
  } else if (saved === 'light') {
    isDark = false
  } else {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  document.documentElement.classList.toggle('dark', isDark)
}

applyTheme()

// Listener jika sistem perangkat berubah tema secara real-time
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if ((localStorage.getItem('theme') || 'system') === 'system') {
    applyTheme()
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)