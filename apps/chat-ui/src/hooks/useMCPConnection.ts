import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type {
  Prompt as MCPPrompt,
  Resource as MCPResource,
  Tool as MCPTool,
} from '@modelcontextprotocol/sdk/types.js';
import { useCallback, useRef, useState } from 'react';
import { clearStoredServerUrl, setStoredServerUrl } from '@/lib/storage';
import { createClient } from '../MCP';

type MCPState = 'disconnected' | 'connecting' | 'loading' | 'ready' | 'failed';

/**
 * Manage MCP server connection state and operations
 *
 * Handles connecting/disconnecting from MCP servers, fetching available tools,
 * prompts, and resources, and providing methods to interact with them.
 *
 * @returns MCP connection state, tools, prompts, resources, and connection methods
 *
 * @example
 * ```ts
 * const {
 *   mcpState,
 *   mcpTools,
 *   connectToServer,
 *   disconnectFromServer,
 *   callPrompt,
 *   readResource,
 * } = useMCPConnection();
 *
 * await connectToServer('http://localhost:8888');
 * ```
 */
export function useMCPConnection() {
  const [mcpState, setMCPState] = useState<MCPState>('disconnected');
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([]);
  const [mcpPrompts, setMcpPrompts] = useState<MCPPrompt[]>([]);
  const [mcpResources, setMcpResources] = useState<MCPResource[]>([]);

  const clientRef = useRef<Client | null>(null);
  const transportRef = useRef<Transport | null>(null);

  const disconnectFromServer = useCallback(async () => {
    if (clientRef.current) {
      try {
        await clientRef.current.close();
      } catch (error) {
        console.error('[useMCPConnection] Error closing client:', error);
      }
      clientRef.current = null;
    }

    if (transportRef.current) {
      try {
        await transportRef.current.close();
      } catch (error) {
        console.error('[useMCPConnection] Error closing transport:', error);
      }
      transportRef.current = null;
    }

    setMcpTools([]);
    setMcpPrompts([]);
    setMcpResources([]);
    setMCPState('disconnected');

    clearStoredServerUrl();
  }, []);

  const connectToServer = useCallback(
    async (url: string) => {
      try {
        new URL(url);
      } catch (error) {
        console.error('[useMCPConnection] Invalid URL:', error);
        setMCPState('failed');
        return;
      }

      await disconnectFromServer();

      setMCPState('connecting');

      try {
        const { client, transport } = createClient(
          {
            _clientInfo: {
              name: 'MCP-UI Demo',
              version: '1.0.0',
            },
          },
          {
            url: new URL(url),
          }
        );

        clientRef.current = client;
        transportRef.current = transport;

        await client.connect(transport);
        setMCPState('loading');

        const [toolsResponse, promptsResponse, resourcesResponse] = await Promise.all([
          client.listTools(),
          client.listPrompts().catch(() => ({ prompts: [] })),
          client.listResources().catch(() => ({ resources: [] })),
        ]);

        setMcpTools(toolsResponse.tools || []);
        setMcpPrompts(promptsResponse.prompts || []);
        setMcpResources(resourcesResponse.resources || []);

        setStoredServerUrl(url);

        setMCPState('ready');
      } catch (error) {
        console.error('[useMCPConnection] MCP connection failed:', error);
        setMCPState('failed');

        clientRef.current = null;
        transportRef.current = null;
      }
    },
    [disconnectFromServer]
  );

  const callPrompt = useCallback(async (name: string, args?: Record<string, string>) => {
    if (!clientRef.current) {
      throw new Error('MCP client not connected');
    }
    try {
      const result = await clientRef.current.getPrompt({ name, arguments: args });
      return result;
    } catch (error) {
      console.error('[useMCPConnection] Prompt call failed:', error);
      throw error;
    }
  }, []);

  const readResource = useCallback(async (uri: string) => {
    if (!clientRef.current) {
      throw new Error('MCP client not connected');
    }
    try {
      const result = await clientRef.current.readResource({ uri });
      return result;
    } catch (error) {
      console.error('[useMCPConnection] Resource read failed:', error);
      throw error;
    }
  }, []);

  return {
    mcpState,
    mcpTools,
    mcpPrompts,
    mcpResources,
    clientRef,
    transportRef,
    connectToServer,
    disconnectFromServer,
    callPrompt,
    readResource,
  };
}
