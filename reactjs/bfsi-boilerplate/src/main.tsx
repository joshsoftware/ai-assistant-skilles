import React from 'react';
import ReactDOM from 'react-dom/client';
import './app/globals.css';
import { App } from './app/App.js';
import './i18n/i18n.js';

const root = document.getElementById('root');
if (!root) {
  throw new Error('root element not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
