import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.tsx';
import './styles/index.css';

// Suppress benign browser tab closing/unload IndexedDB errors from Firebase Auth
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = typeof reason === 'string' ? reason : reason?.message || reason?.toString?.() || '';
  if (
    msg.includes('Database is closing') ||
    msg.includes('closing/hidden') ||
    msg.includes('database connection is closing')
  ) {
    event.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
