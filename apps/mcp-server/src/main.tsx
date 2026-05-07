import { initializeWebModelContext } from '@mcp-b/global';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import App from './App';
import { ErrorBoundary } from './ErrorBoundary';

type RegisteredTool = {
  name: string;
  description: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
  annotations?: unknown;
};

type TestingTool = {
  name: string;
  description: string;
  inputSchema: string;
};

type NavigatorWithModelContext = Navigator & {
  modelContext?: {
    listTools?: () => RegisteredTool[];
  };
  modelContextTesting?: {
    listTools?: () => TestingTool[];
    getRegisteredTools?: () => RegisteredTool[];
  };
};

function parseInputSchema(inputSchema: string | undefined): unknown {
  if (!inputSchema) {
    return {};
  }

  try {
    return JSON.parse(inputSchema);
  } catch {
    return {};
  }
}

function toTestingTools(tools: RegisteredTool[]): TestingTool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: JSON.stringify(tool.inputSchema ?? { type: 'object', properties: {} }),
  }));
}

function installPartialNativeApiShims() {
  if (typeof window === 'undefined') return;

  const navigatorWithModelContext = window.navigator as NavigatorWithModelContext;
  const nativeModelContext = navigatorWithModelContext.modelContext;
  const nativeTesting = navigatorWithModelContext.modelContextTesting;

  if (!nativeModelContext || !nativeTesting) return;

  if (
    typeof nativeTesting.listTools !== 'function' &&
    typeof nativeTesting.getRegisteredTools === 'function'
  ) {
    nativeTesting.listTools = () => toTestingTools(nativeTesting.getRegisteredTools?.() ?? []);
  }

  if (
    typeof nativeTesting.getRegisteredTools !== 'function' &&
    typeof nativeTesting.listTools === 'function'
  ) {
    nativeTesting.getRegisteredTools = () =>
      nativeTesting.listTools?.().map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: parseInputSchema(tool.inputSchema),
      })) ?? [];
  }

  if (
    typeof nativeModelContext.listTools !== 'function' &&
    typeof nativeTesting.getRegisteredTools === 'function'
  ) {
    nativeModelContext.listTools = () => nativeTesting.getRegisteredTools?.() ?? [];
  }
}

installPartialNativeApiShims();

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
      <App />
    </ErrorBoundary>
  </StrictMode>
);
