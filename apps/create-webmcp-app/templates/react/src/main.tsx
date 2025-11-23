/**
 * Entry point for the WebMCP Template App
 *
 * This file initializes the React app and sets up WebMCP integration.
 */

import { initializeWebModelContext } from '@mcp-b/global';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

initializeWebModelContext({
  transport: {
    tabServer: {
      allowedOrigins: ['*'],
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
