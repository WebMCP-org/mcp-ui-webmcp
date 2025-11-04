import * as Sentry from '@sentry/react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UIResourceProvider } from './contexts/UIResourceContext';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE;
const isDevelopment = environment === 'development';

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment,
    sendDefaultPii: true,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: isDevelopment ? 1.0 : 0.2,
    tracePropagationTargets: [
      /^\/api\//,
      /^https:\/\/.*\.workers\.dev/,
      /^https:\/\/.*\.anthropic\.com/,
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    ignoreErrors: [
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      'NetworkError',
      'Failed to fetch',
    ],
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <UIResourceProvider>
      <App />
    </UIResourceProvider>
  </ErrorBoundary>
);
