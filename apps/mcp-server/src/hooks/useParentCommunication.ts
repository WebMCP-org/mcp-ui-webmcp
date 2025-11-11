/**
 * Parent communication hook for iframe messaging
 *
 * This hook handles the "parent readiness protocol" and provides
 * methods to communicate with the parent window via postMessage.
 *
 * When embedded in an iframe (inside AI assistant), this ensures
 * the parent is ready before sending messages, preventing race conditions.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Get the parent origin from environment or detect it dynamically
 *
 * Priority order:
 * 1. VITE_PARENT_ORIGIN environment variable
 * 2. document.referrer (if available)
 * 3. '*' as fallback (insecure, should only be used in development)
 */
function getParentOrigin(): string {
  const envOrigin = import.meta.env.VITE_PARENT_ORIGIN;
  if (envOrigin) {
    return envOrigin;
  }

  if (typeof document !== 'undefined' && document.referrer) {
    try {
      return new URL(document.referrer).origin;
    } catch (e) {
      console.warn('[useParentCommunication] Failed to parse document.referrer:', e);
    }
  }

  if (import.meta.env.DEV) {
    console.warn(
      '[useParentCommunication] Using wildcard (*) for parent origin. ' +
      'Set VITE_PARENT_ORIGIN environment variable for better security.'
    );
  }

  return '*';
}

/**
 * Return type for the useParentCommunication hook
 */
export interface UseParentCommunicationReturn {
  /** Whether the parent window is ready to receive messages */
  isParentReady: boolean;
  /**
   * Send a markdown notification to the parent window
   * @param content - Markdown content to send
   * @param logLabel - Label for console logging (debugging)
   */
  postNotifyMarkdown: (content: string, logLabel: string) => void;
  /**
   * Notify parent of current document dimensions
   * Allows parent to resize iframe to fit content
   */
  notifyParentOfCurrentDocumentSize: () => void;
}

/**
 * Hook for managing parent window communication via postMessage
 *
 * Implements the parent readiness protocol:
 * 1. Child sends "ui-lifecycle-iframe-ready" on mount
 * 2. Parent responds with one of several "ready" message types
 * 3. Child sets isParentReady=true
 * 4. Child can now safely send messages
 *
 * @returns Parent communication state and methods
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isParentReady, postNotifyMarkdown } = useParentCommunication();
 *
 *   const handleMove = () => {
 *     if (isParentReady) {
 *       postNotifyMarkdown('Move completed!', 'move-update');
 *     }
 *   };
 * }
 * ```
 */
export function useParentCommunication(): UseParentCommunicationReturn {
  const [isParentReady, setIsParentReady] = useState<boolean>(false);
  const parentOriginRef = useRef<string>(getParentOrigin());

  /**
   * Parent Readiness Protocol
   *
   * Establishes communication readiness with parent window.
   * If not in iframe, immediately marks as ready.
   */
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const embedded = window.parent !== window;

    if (!embedded) {
      setIsParentReady(true);
      return;
    }

    const parentOrigin = parentOriginRef.current;

    const markReady = () => {
      setIsParentReady((prev) => (prev ? prev : true));
    };

    const handleMessage = (event: MessageEvent) => {
      if (parentOrigin !== '*' && event.origin !== parentOrigin) {
        // Only log protocol messages to avoid noise from other window messages
        if (event.data?.type?.startsWith('ui-') || event.data?.type === 'parent-ready') {
          console.warn(
            `[useParentCommunication] Rejected message from origin ${event.origin}, ` +
            `expected ${parentOrigin}`
          );
        }
        return;
      }

      const data = event.data;
      if (!data || typeof data !== 'object') {
        return;
      }

      const { type, payload } = data as {
        type?: string;
        payload?: unknown;
      };

      if (type === 'ui-lifecycle-iframe-render-data') {
        markReady();
        return;
      }

      if (type === 'parent-ready') {
        markReady();
        return;
      }

      if (payload && typeof payload === 'object') {
        const maybePayload = payload as {
          ready?: unknown;
          status?: unknown;
          response?: { status?: unknown };
        };

        if (
          maybePayload.response &&
          typeof maybePayload.response === 'object' &&
          'status' in maybePayload.response &&
          maybePayload.response.status === 'ready'
        ) {
          markReady();
          return;
        }

        if (maybePayload.status === 'ready' || maybePayload.ready === true) {
          markReady();
          return;
        }
      }

      if (type === 'ui-message-response' || type === 'ui-message-received') {
        markReady();
      }
    };

    window.addEventListener('message', handleMessage);
    window.parent.postMessage({ type: 'ui-lifecycle-iframe-ready' }, parentOrigin);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  /**
   * Send markdown notification to parent window
   */
  const postNotifyMarkdown = useCallback(
    (content: string, logLabel: string) => {
      if (!isParentReady) {
        console.info(`[TicTacToe] Deferred notify until parent ready: ${logLabel}`);
        return;
      }

      if (typeof window === 'undefined' || window.parent === window) {
        return;
      }

      const parentOrigin = parentOriginRef.current;
      window.parent.postMessage(
        {
          type: 'notify',
          payload: { message: content },
        },
        parentOrigin
      );
    },
    [isParentReady]
  );

  /**
   * Notify parent of current document size
   * Allows parent to resize iframe to fit content
   *
   * Based on pattern from:
   * https://github.com/idosal/mcp-ui/issues/100
   */
  const notifyParentOfCurrentDocumentSize = useCallback(() => {
    if (typeof window === 'undefined' || window.parent === window) {
      return;
    }

    const parentOrigin = parentOriginRef.current;
    const height = document.documentElement.scrollHeight;
    const width = document.documentElement.scrollWidth;

    window.parent.postMessage(
      {
        type: 'ui-size-change',
        payload: { height, width },
      },
      parentOrigin
    );
  }, []);

  return {
    isParentReady,
    postNotifyMarkdown,
    notifyParentOfCurrentDocumentSize,
  };
}
