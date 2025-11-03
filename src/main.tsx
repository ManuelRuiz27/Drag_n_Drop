import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import App from './App';
import './styles.css';

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Service Worker registrado: ${swUrl}`, registration);
    }
  },
  onRegisterError(error) {
    console.error('Error al registrar el Service Worker', error);
  }
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
