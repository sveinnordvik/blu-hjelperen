import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Ignorer WebSocket/HMR-feil i AI Studio preview-miljøet
window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = String(event.reason?.message || event.reason || '');
  if (
    reasonStr.toLowerCase().includes('websocket') ||
    reasonStr.toLowerCase().includes('closed without opened') ||
    event.reason?.stack?.includes('@vite/client')
  ) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const msg = String(event.message || '');
  if (
    msg.toLowerCase().includes('websocket') ||
    event.filename?.includes('@vite/client')
  ) {
    event.preventDefault();
  }
});

// Tving avregistrering av alle service workers ved oppstart
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let r of registrations) {
      r.unregister();
    }
  }).catch(err => console.error('SW unregister error:', err));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
