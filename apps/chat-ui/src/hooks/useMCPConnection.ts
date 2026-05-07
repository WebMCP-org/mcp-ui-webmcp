import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  ElicitRequestSchema,
  type ClientResult,
  type Prompt as MCPPrompt,
  type Resource as MCPResource,
  type Tool as MCPTool,
} from '@modelcontextprotocol/sdk/types.js';
import { useCallback, useRef, useState } from 'react';
import { clearStoredServerUrl, setStoredServerUrl } from '@/lib/storage';
import { createClient } from '../MCP';
import type { ElicitationRequest } from '@/components/ElicitationInlineForm';


type MCPState = 'disconnected' | 'connecting' | 'loading' | 'ready' | 'failed';

// Extend the request type to include our internal ID and assigned tool call
type PendingElicitation = ElicitationRequest & {
  requestId: string;
  assignedToolCallId?: string;
};

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
  const [pendingElicitations, setPendingElicitations] = useState<Map<string, PendingElicitation>>(new Map());

  const resolversRef = useRef<Map<string, (result: ClientResult) => void>>(new Map());
  const activeToolCallsRef = useRef<Map<string, { toolName: string; startTime: number }>>(new Map());

  const clientRef = useRef<Client | null>(null);
  const transportRef = useRef<Transport | null>(null);

  const assignElicitation = useCallback((requestId: string, toolCallId: string) => {
    console.log('[useMCPConnection] Assigning elicitation to tool:', { requestId, toolCallId });

    setPendingElicitations((prev) => {
      const elicitation = prev.get(requestId);
      if (!elicitation) {
        console.warn('[useMCPConnection] Elicitation not found:', requestId);
        return prev;
      }

      const next = new Map(prev);
      next.set(requestId, {
        ...elicitation,
        assignedToolCallId: toolCallId,
      });
      return next;
    });
  }, []);

  const submitElicitation = useCallback(
    (requestId: string, result: { action: 'accept' | 'decline' | 'cancel'; data?: ClientResult }) => {
      console.log('[useMCPConnection] Submitting elicitation:', { requestId, result });

      if (requestId && resolversRef.current.has(requestId)) {
        const resolve = resolversRef.current.get(requestId)!;

        resolve({
          action: result.action,
          content: result.action === 'accept' ? result.data : undefined,
        });

        resolversRef.current.delete(requestId);
        setPendingElicitations((prev) => {
          const next = new Map(prev);
          next.delete(requestId);
          return next;
        });
      } else {
        console.warn('[useMCPConnection] No active resolver found for request:', requestId);
      }
    },
    []
  );

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

    setPendingElicitations(new Map());
    resolversRef.current.clear();

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
            capabilities: {
              elicitation: {
                form: {},
                url: {},
              },
            },
          },
          {
            url: new URL(url),
          }
        );

        client.setRequestHandler(ElicitRequestSchema, async (request) => {
          const { promise, resolve } = Promise.withResolvers<ClientResult>();

          // Generate a unique ID for this request
          const requestId = crypto.randomUUID();
          console.log('[useMCPConnection] Handling elicitation request:', { requestId, request });

          // Store resolver in the map
          resolversRef.current.set(requestId, resolve);

          // Find the most recently started active tool call to auto-assign
          let assignedToolCallId: string | undefined;
          if (activeToolCallsRef.current.size > 0) {
            // Get most recent tool call (highest startTime)
            let mostRecent: { toolCallId: string; startTime: number } | null = null;
            for (const [toolCallId, info] of activeToolCallsRef.current.entries()) {
              if (!mostRecent || info.startTime > mostRecent.startTime) {
                mostRecent = { toolCallId, startTime: info.startTime };
              }
            }
            if (mostRecent) {
              assignedToolCallId = mostRecent.toolCallId;
              console.log('[useMCPConnection] Auto-assigning elicitation to active tool:', {
                requestId,
                toolCallId: assignedToolCallId,
                toolName: activeToolCallsRef.current.get(assignedToolCallId)?.toolName,
              });
            }
          }

          // Add to pending elicitations map with auto-assignment
          setPendingElicitations((prev) => {
            const next = new Map(prev);
            next.set(requestId, {
              params: request.params,
              requestId,
              assignedToolCallId,
            });
            return next;
          });

          const result = await promise; // Ensure state is updated before
          console.log('[useMCPConnection] Elicitation result ready:', { requestId, result });
          return result;
        });
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

  const registerToolCall = useCallback((toolCallId: string, toolName: string) => {
    console.log('[useMCPConnection] Registering active tool call:', { toolCallId, toolName });
    activeToolCallsRef.current.set(toolCallId, {
      toolName,
      startTime: Date.now(),
    });
  }, []);

  const unregisterToolCall = useCallback((toolCallId: string) => {
    console.log('[useMCPConnection] Unregistering tool call:', { toolCallId });
    activeToolCallsRef.current.delete(toolCallId);
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
    pendingElicitations,
    submitElicitation,
    assignElicitation,
    registerToolCall,
    unregisterToolCall,
  };
}
