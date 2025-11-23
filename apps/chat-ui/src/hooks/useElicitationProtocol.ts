/**
 * Hook for handling the Rich Elicitation Protocol with UI Delegation
 *
 * This hook manages the complete elicitation lifecycle:
 * 1. Detects elicitation requests in tool call results
 * 2. Sends ui/notifications/elicitation-context to Guest UI
 * 3. Receives ui/submit-elicitation from Guest UI
 * 4. Validates submissions against requestedSchema
 * 5. Forwards validated results back to the server
 */

import { useCallback, useEffect, useRef } from 'react';
import Ajv from 'ajv';

// Initialize AJV for JSON Schema validation
const ajv = new Ajv({ allErrors: true, strict: false });

/**
 * Elicitation metadata from tool call result
 */
interface ElicitationMetadata {
  message: string;
  requestedSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
  };
  ui?: {
    uri: string;
    mode?: 'modal' | 'inline' | 'sidebar';
    context?: Record<string, unknown>;
  };
}

/**
 * Elicitation submission from Guest UI
 */
interface ElicitationSubmission {
  jsonrpc: '2.0';
  method: 'ui/submit-elicitation';
  params: {
    action: 'accept' | 'decline' | 'cancel';
    content: Record<string, unknown> | null;
  };
}

/**
 * Pending elicitation state
 */
interface PendingElicitation {
  metadata: ElicitationMetadata;
  iframe: HTMLIFrameElement;
  resolve: (result: { action: string; content?: unknown }) => void;
  reject: (error: Error) => void;
}

export function useElicitationProtocol() {
  const pendingElicitationsRef = useRef<Map<string, PendingElicitation>>(new Map());

  /**
   * Send elicitation context to Guest UI
   */
  const sendElicitationContext = useCallback(
    (iframe: HTMLIFrameElement, metadata: ElicitationMetadata) => {
      if (!iframe.contentWindow) {
        console.warn('[Elicitation] Cannot send context: iframe has no contentWindow');
        return;
      }

      console.log('[Elicitation] Sending context to Guest UI:', metadata);

      iframe.contentWindow.postMessage(
        {
          jsonrpc: '2.0',
          method: 'ui/notifications/elicitation-context',
          params: {
            message: metadata.message,
            schema: metadata.requestedSchema,
            context: metadata.ui?.context,
          },
        },
        '*'
      );
    },
    []
  );

  /**
   * Validate submission against JSON Schema
   */
  const validateSubmission = useCallback(
    (content: unknown, schema: ElicitationMetadata['requestedSchema']): { valid: boolean; errors?: string[] } => {
      try {
        const validate = ajv.compile(schema);
        const valid = validate(content);

        if (!valid && validate.errors) {
          const errors = validate.errors.map(
            (err) => `${err.instancePath} ${err.message}`
          );
          return { valid: false, errors };
        }

        return { valid: true };
      } catch (error) {
        console.error('[Elicitation] Schema validation error:', error);
        return {
          valid: false,
          errors: ['Failed to validate schema: ' + (error instanceof Error ? error.message : 'Unknown error')],
        };
      }
    },
    []
  );

  /**
   * Handle elicitation submission from Guest UI
   */
  const handleElicitationSubmission = useCallback(
    (event: MessageEvent) => {
      if (!event.data || event.data.method !== 'ui/submit-elicitation') {
        return;
      }

      const submission = event.data as ElicitationSubmission;
      console.log('[Elicitation] Received submission:', submission);

      // Find the pending elicitation for this iframe
      let matchingElicitation: PendingElicitation | null = null;
      let matchingId: string | null = null;

      for (const [id, elicitation] of pendingElicitationsRef.current) {
        if (elicitation.iframe.contentWindow === event.source) {
          matchingElicitation = elicitation;
          matchingId = id;
          break;
        }
      }

      if (!matchingElicitation || !matchingId) {
        console.warn('[Elicitation] Received submission for unknown iframe');
        return;
      }

      const { metadata, resolve, reject } = matchingElicitation;

      // Handle cancel/decline
      if (submission.params.action === 'cancel' || submission.params.action === 'decline') {
        pendingElicitationsRef.current.delete(matchingId);
        resolve({ action: submission.params.action });
        return;
      }

      // Handle accept - validate content
      if (submission.params.action === 'accept') {
        if (!submission.params.content) {
          console.warn('[Elicitation] Accept action requires content');
          reject(new Error('Accept action requires content'));
          pendingElicitationsRef.current.delete(matchingId);
          return;
        }

        const validation = validateSubmission(submission.params.content, metadata.requestedSchema);

        if (!validation.valid) {
          console.warn('[Elicitation] Validation failed:', validation.errors);

          // Send error back to UI for user correction
          sendElicitationContext(matchingElicitation.iframe, {
            ...metadata,
            ui: {
              ...metadata.ui,
              uri: metadata.ui?.uri || '',
              context: {
                ...metadata.ui?.context,
                error: validation.errors?.join(', ') || 'Validation failed',
              },
            },
          });
          return;
        }

        // Validation passed - resolve with content
        console.log('[Elicitation] Validation passed, resolving with content');
        pendingElicitationsRef.current.delete(matchingId);
        resolve({
          action: 'accept',
          content: submission.params.content,
        });
      }
    },
    [validateSubmission, sendElicitationContext]
  );

  /**
   * Set up message listener for elicitation submissions
   */
  useEffect(() => {
    window.addEventListener('message', handleElicitationSubmission);

    return () => {
      window.removeEventListener('message', handleElicitationSubmission);
    };
  }, [handleElicitationSubmission]);

  /**
   * Register an elicitation request
   * Returns a promise that resolves when the user submits/cancels/declines
   */
  const registerElicitation = useCallback(
    (iframe: HTMLIFrameElement, metadata: ElicitationMetadata): Promise<{ action: string; content?: unknown }> => {
      const elicitationId = `elicitation-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      return new Promise((resolve, reject) => {
        pendingElicitationsRef.current.set(elicitationId, {
          metadata,
          iframe,
          resolve,
          reject,
        });

        // Wait for iframe to be ready, then send context
        const checkReady = () => {
          if (iframe.contentWindow) {
            // Send context immediately for iframes that are already loaded
            setTimeout(() => {
              sendElicitationContext(iframe, metadata);
            }, 100);
          } else {
            // Retry if not ready
            setTimeout(checkReady, 50);
          }
        };

        checkReady();

        // Set timeout for elicitation (5 minutes)
        setTimeout(() => {
          if (pendingElicitationsRef.current.has(elicitationId)) {
            pendingElicitationsRef.current.delete(elicitationId);
            reject(new Error('Elicitation timeout'));
          }
        }, 5 * 60 * 1000);
      });
    },
    [sendElicitationContext]
  );

  /**
   * Check if a tool result contains elicitation metadata
   */
  const detectElicitation = useCallback((toolResult: { metadata?: { elicitation?: ElicitationMetadata } }): ElicitationMetadata | null => {
    return toolResult?.metadata?.elicitation || null;
  }, []);

  return {
    registerElicitation,
    detectElicitation,
    sendElicitationContext,
  };
}
