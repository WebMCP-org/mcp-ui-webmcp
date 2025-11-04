import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type {
  CallToolRequest,
  CallToolResult,
  Tool as MCPTool,
} from '@modelcontextprotocol/sdk/types.js';
import { useCallback, useEffect, useRef, useState } from 'react';

type ToolWithSource = MCPTool & { _sourceId: string };

/**
 * Manage WebMCP iframe clients and dynamic tool registration
 *
 * Handles registration of WebMCP clients from iframes, manages their tools,
 * and routes tool calls to the appropriate client based on source ID.
 *
 * @returns WebMCP tools, client registration methods, and tool calling function
 *
 * @example
 * ```ts
 * const {
 *   webMcpTools,
 *   registerWebMcpClient,
 *   registerWebMcpTools,
 *   unregisterWebMcpClient,
 *   callTool,
 * } = useWebMCPIntegration();
 *
 * // Register a client from an iframe
 * registerWebMcpClient('iframe-1', client);
 *
 * // Register tools from that client
 * registerWebMcpTools(tools, 'iframe-1');
 *
 * // Call a tool
 * const result = await callTool({ name: 'tool_name', arguments: {} }, 'iframe-1');
 * ```
 */
export function useWebMCPIntegration() {
  const [webMcpTools, setWebMcpTools] = useState<MCPTool[]>([]);
  const webMcpClients = useRef<Map<string, Client>>(new Map());

  const registerWebMcpClient = useCallback((sourceId: string, webMcpClient: Client) => {
    webMcpClients.current.set(sourceId, webMcpClient);
  }, []);

  const registerWebMcpTools = useCallback((tools: MCPTool[], sourceId: string) => {
    setWebMcpTools((prev) => {
      const filtered = prev.filter((t) => (t as ToolWithSource)._sourceId !== sourceId);
      const tagged = tools.map((t) => ({ ...t, _sourceId: sourceId }) as ToolWithSource);
      return [...filtered, ...tagged];
    });
  }, []);

  const unregisterWebMcpClient = useCallback((sourceId: string) => {
    const webMcpClient = webMcpClients.current.get(sourceId);
    if (webMcpClient) {
      webMcpClient.close?.();
      webMcpClients.current.delete(sourceId);
    }
    setWebMcpTools((prev) => prev.filter((t) => (t as ToolWithSource)._sourceId !== sourceId));
  }, []);

  const callTool = useCallback(
    async (request: CallToolRequest['params'], sourceId?: string): Promise<CallToolResult> => {
      if (!sourceId) {
        throw new Error('Source ID is required for WebMCP tool calls');
      }

      const webMcpClient = webMcpClients.current.get(sourceId);
      if (!webMcpClient) {
        throw new Error(`WebMCP client not found for source: ${sourceId}`);
      }
      try {
        const result = await webMcpClient.callTool(request);
        return result as CallToolResult;
      } catch (error) {
        console.error(`[useWebMCPIntegration] WebMCP Client ${sourceId} Tool call failed:`, error);
        throw error;
      }
    },
    []
  );

  useEffect(() => {
    const clients = webMcpClients;
    return () => {
      clients.current.forEach((client) => {
        client.close().catch(console.error);
      });
      clients.current.clear();
    };
  }, []);

  return {
    webMcpTools,
    webMcpClients,
    registerWebMcpClient,
    registerWebMcpTools,
    unregisterWebMcpClient,
    callTool,
  };
}
