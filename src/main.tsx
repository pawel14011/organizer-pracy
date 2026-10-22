import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Obsługa środowiska WordPress (#organizer-pracy-root) oraz środowiska Vercel / standalone (#root)
const rootElement = document.getElementById('organizer-pracy-root') ?? document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
