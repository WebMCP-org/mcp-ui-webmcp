/**
 * MCP App hook using official @modelcontextprotocol/ext-apps SDK
 *
 * Replaces the custom useParentCommunication hook with the official
 * App class and PostMessageTransport from the MCP Apps specification.
 *
 * This hook handles:
 * - ui/initialize handshake with host
 * - Automatic size change notifications
 * - Tool input/result notifications
 * - Communication with parent via official SDK methods
 */

import {
  App,
  PostMessageTransport,
  McpUiToolInputNotificationSchema,
  McpUiToolResultNotificationSchema,
} from '@modelcontextprotocol/ext-apps';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Return type for the useMcpApp hook
 */
export interface UseMcpAppReturn {
  /** Whether the app is connected to the host */
  isConnected: boolean;
  /** The connected App instance (if connected) */
  app: App | null;
  /** Error during connection (if any) */
  error: Error | null;
  /**
   * Send a log notification to the host
   * @param content - Text content to log
   * @param level - Log level (info, warn, error, etc.)
   */
  sendLog: (content: string, level?: string) => Promise<void>;
  /**
   * Send a message to the chat interface
   * @param content - Message content to send
   */
  sendMessage: (content: string) => Promise<void>;
}

/**
 * Hook for MCP Apps integration using official SDK
 *
 * Automatically handles:
 * 1. App initialization with ui/initialize
 * 2. Host capability negotiation
 * 3. Automatic resize notifications
 * 4. Tool input/result notification handling
 *
 * @returns MCP App state and methods
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isConnected, sendLog, sendMessage } = useMcpApp();
 *
 *   const handleMove = async () => {
 *     if (isConnected) {
 *       await sendLog('Move completed!');
 *     }
 *   };
 * }
 * ```
 */
export function useMcpApp(): UseMcpAppReturn {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const appRef = useRef<App | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  /**
   * Initialize MCP App connection
   */
  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (isInitializedRef.current) {
      return;
    }

    // Check if we're in an iframe
    if (typeof window === 'undefined') {
      return;
    }

    const isEmbedded = window.parent !== window;

    if (!isEmbedded) {
      // Not in iframe - mark as ready immediately
      setIsConnected(true);
      isInitializedRef.current = true;
      return;
    }

    // Create App instance
    const app = new App(
      {
        name: 'TicTacToe App',
        version: '1.0.0',
      },
      {
        experimental: {},
      },
      {
        autoResize: true, // Automatic size change notifications
      }
    );

    appRef.current = app;

    // Set up notification handlers
    app.setNotificationHandler(
      McpUiToolInputNotificationSchema,
      async (notification) => {
        console.log('[MCP App] Received tool input:', notification.params.arguments);
      }
    );

    app.setNotificationHandler(
      McpUiToolResultNotificationSchema,
      async (notification) => {
        console.log('[MCP App] Received tool result:', notification.params);
      }
    );

    // Connect to parent
    const transport = new PostMessageTransport(window.parent, undefined);

    app
      .connect(transport)
      .then(() => {
        console.log('[MCP App] Connected to host via official SDK');
        setIsConnected(true);
        isInitializedRef.current = true;
      })
      .catch((err) => {
        console.error('[MCP App] Connection failed:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      });

    // Cleanup
    return () => {
      if (appRef.current) {
        appRef.current.close().catch(console.error);
        appRef.current = null;
      }
    };
  }, []);

  /**
   * Send log notification to host
   */
  const sendLog = useCallback(
    async (content: string, level: string = 'info') => {
      if (!appRef.current || !isConnected) {
        console.info(`[MCP App] Deferred log until connected: ${content}`);
        return;
      }

      try {
        await appRef.current.sendLog({
          level: level as 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency',
          data: content,
        });
      } catch (err) {
        console.error('[MCP App] Failed to send log:', err);
      }
    },
    [isConnected]
  );

  /**
   * Send message to chat interface
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!appRef.current || !isConnected) {
        console.info(`[MCP App] Deferred message until connected: ${content}`);
        return;
      }

      try {
        await appRef.current.sendMessage({
          role: 'user',
          content: [{ type: 'text', text: content }],
        });
      } catch (err) {
        console.error('[MCP App] Failed to send message:', err);
      }
    },
    [isConnected]
  );

  return {
    isConnected,
    app: appRef.current,
    error,
    sendLog,
    sendMessage,
  };
}
