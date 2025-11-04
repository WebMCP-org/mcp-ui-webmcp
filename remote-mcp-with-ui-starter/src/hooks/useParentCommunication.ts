/**
 * Parent communication hook for iframe messaging
 *
 * This hook handles the "parent readiness protocol" and provides
 * methods to communicate with the parent window via postMessage.
 *
 * When embedded in an iframe (inside AI assistant), this ensures
 * the parent is ready before sending messages, preventing race conditions.
 */

import { useCallback, useEffect, useState } from 'react';

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

    // Not in iframe - no parent to wait for
    if (!embedded) {
      setIsParentReady(true);
      return;
    }

    const markReady = () => {
      setIsParentReady((prev) => (prev ? prev : true));
    };

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') {
        return;
      }

      const { type, payload } = data as {
        type?: string;
        payload?: unknown;
      };

      // Handle various ready message types
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
    window.parent.postMessage({ type: 'ui-lifecycle-iframe-ready' }, '*');

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

      window.parent.postMessage(
        {
          type: 'notify',
          payload: { message: content },
        },
        '*'
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

    const height = document.documentElement.scrollHeight;
    const width = document.documentElement.scrollWidth;

    window.parent.postMessage(
      {
        type: 'ui-size-change',
        payload: { height, width },
      },
      '*'
    );
  }, []);

  return {
    isParentReady,
    postNotifyMarkdown,
    notifyParentOfCurrentDocumentSize,
  };
}
