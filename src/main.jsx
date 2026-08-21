import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import EmbedForm from './components/EmbedForm.jsx'
import { registerSW } from 'virtual:pwa-register'

// Register the PWA service worker with auto-update
registerSW({ immediate: true })

const path = window.location.pathname;

// Dynamic PWA Manifest Swap
const manifestLink = document.querySelector('link[rel="manifest"]');
if (manifestLink) {
  if (path.includes('/qr-form')) {
    manifestLink.setAttribute('href', '/qr-manifest.webmanifest');
  } else {
    manifestLink.setAttribute('href', '/manifest.webmanifest');
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {path.startsWith('/forms/embed') ? <EmbedForm /> : <App />}
  </StrictMode>,
)
