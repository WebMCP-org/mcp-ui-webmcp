import type { UIResourceRenderer } from '@mcp-ui/client';
import type { ComponentProps } from 'react';
import { createContext, useContext } from 'react';

/**
 * Type representing a UI embedded resource from MCP-UI
 */
export type UIEmbeddedResource = ComponentProps<typeof UIResourceRenderer>['resource'];

/**
 * Individual UI resource item managed by the context
 */
export type UIResourceItem = {
  /** Unique identifier for this resource instance */
  id: string;
  /** Name of the tool that generated this resource */
  toolName: string;
  /** The actual UI resource data */
  resource: UIEmbeddedResource;
  /** Timestamp when the resource was created */
  timestamp: Date;
  /** Optional tool call ID for tracing */
  toolCallId?: string;
  /** Ref to the iframe element (for WebMCP integration) */
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  /** Optional cleanup function to call when resource is removed */
  cleanup?: () => Promise<void>;
};

/**
 * Context value interface for UI resources management
 */
export interface UIResourceContextValue {
  /** List of all UI resources */
  resources: UIResourceItem[];
  /** Currently selected resource ID */
  selectedResourceId: string | null;
  /** Add a new UI resource */
  addResource: (item: Omit<UIResourceItem, 'id' | 'timestamp' | 'iframeRef' | 'cleanup'>) => void;
  /** Remove a UI resource by ID (async to support cleanup) */
  removeResource: (id: string) => Promise<void>;
  /** Select a UI resource by ID */
  selectResource: (id: string | null) => void;
  /** Clear all UI resources */
  clearAll: () => Promise<void>;
  /** Set cleanup function for a resource (avoids state mutation) */
  setResourceCleanup: (id: string, cleanup: () => Promise<void>) => void;
}

/**
 * Context for managing UI resources across the application
 */
export const UIResourceContext = createContext<UIResourceContextValue | null>(null);

/**
 * Hook to access the UI resources context
 * @throws {Error} If used outside of UIResourceProvider
 */
export const useUIResources = (): UIResourceContextValue => {
  const context = useContext(UIResourceContext);
  if (!context) {
    throw new Error('useUIResources must be used within UIResourceProvider');
  }
  return context;
};
