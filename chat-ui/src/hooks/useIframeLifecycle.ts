import { IframeParentTransport } from '@mcp-b/transports';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { useCallback } from 'react';
import { useUIResources } from '@/contexts/UIResourceContext';
import { useMCP } from '@/hooks/useMCP';
import { getStoredServerUrl } from '@/lib/storage';

/**
 * Handle iframe WebMCP setup, tool registration, and cleanup
 *
 * Provides a function to set up WebMCP connection for an iframe, including:
 * - UI lifecycle protocol handshake
 * - Client and transport creation
 * - Tool registration and list change handling
 * - Cleanup function registration
 *
 * @returns Object containing the setupIframe function
 *
 * @example
 * ```ts
 * const { setupIframe } = useIframeLifecycle();
 *
 * <iframe
 *   ref={iframeRef}
 *   onLoad={(e) => {
 *     setupIframe(e.currentTarget, 'unique-source-id');
 *   }}
 * />
 * ```
 */
export function useIframeLifecycle() {
  const { registerWebMcpClient, registerWebMcpTools, unregisterWebMcpClient } = useMCP();
  const { setResourceCleanup } = useUIResources();

  const setupIframe = useCallback(
    async (iframe: HTMLIFrameElement, sourceId: string) => {
      // UI Lifecycle Protocol Handler
      // Listen for iframe ready signal and respond to enable UI interaction
      const handleIframeLifecycleMessage = (event: MessageEvent) => {
        // Basic origin check - accept messages from the iframe
        if (event.source !== iframe.contentWindow) {
          return;
        }

        // Respond to iframe ready signal
        if (event.data?.type === 'ui-lifecycle-iframe-ready') {
          console.log('[useIframeLifecycle] Iframe ready, sending parent-ready signal');
          iframe.contentWindow?.postMessage({ type: 'parent-ready', payload: {} }, '*');
        }
      };

      window.addEventListener('message', handleIframeLifecycleMessage);

      // Create Client + Transport pair (1-to-1 relationship)
      const client = new Client({
        name: 'WebMCP Client',
        version: '1.0.0',
      });
      const transport = new IframeParentTransport({
        targetOrigin: new URL(getStoredServerUrl()).origin,
        iframe: iframe,
      });

      try {
        await client.connect(transport);

        // Register client for tool routing
        registerWebMcpClient(sourceId, client);

        // Fetch and register tools with app
        const toolsResponse = await client.listTools();
        registerWebMcpTools(toolsResponse.tools, sourceId);

        // Listen for tool list changes
        client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
          const updated = await client.listTools();
          registerWebMcpTools(updated.tools, sourceId);
        });

        // Store cleanup function in the resource (properly via context method)
        setResourceCleanup(sourceId, async () => {
          try {
            // Clean up UI lifecycle listener
            window.removeEventListener('message', handleIframeLifecycleMessage);

            await client.close();
            await transport.close();
          } catch (error) {
            console.error(`[useIframeLifecycle] Error closing client/transport for ${sourceId}:`, error);
          }
          // Trigger App-level cleanup (removes tools from state)
          unregisterWebMcpClient(sourceId);
        });
      } catch (error) {
        console.error('[useIframeLifecycle] WebMCP connection failed:', error);
      }
    },
    [registerWebMcpClient, registerWebMcpTools, unregisterWebMcpClient, setResourceCleanup]
  );

  return { setupIframe };
}
