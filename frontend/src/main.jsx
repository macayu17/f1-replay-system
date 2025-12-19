import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Expose build info for easy debugging in the browser console
try {
  if (typeof window !== 'undefined' && typeof __BUILD_INFO__ !== 'undefined') {
    window.__BUILD_INFO__ = __BUILD_INFO__;
    // Helpful breadcrumb in console
    // eslint-disable-next-line no-console
    console.log('[build]', __BUILD_INFO__);
  }
} catch {
  // ignore
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
