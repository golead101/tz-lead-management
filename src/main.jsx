import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import EmbedForm from './components/EmbedForm.jsx'

const path = window.location.pathname;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {path.startsWith('/forms/embed') ? <EmbedForm /> : <App />}
  </StrictMode>,
)
