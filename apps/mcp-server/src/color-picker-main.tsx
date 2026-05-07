import { initializeWebModelContext } from '@mcp-b/global';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import ColorPickerApp from './ColorPickerApp';
import { ErrorBoundary } from './ErrorBoundary';

initializeWebModelContext({
  transport: {
    tabServer: {
      allowedOrigins: ['*'], // Allow any origin for iframe communication
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <ColorPickerApp />
    </ErrorBoundary>
  </StrictMode>
);
