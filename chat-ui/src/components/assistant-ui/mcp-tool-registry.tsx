import { useAssistantTool } from '@assistant-ui/react';
import { isUIResource } from '@mcp-ui/client';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { CallToolResult, Tool as MCPTool } from '@modelcontextprotocol/sdk/types.js';
import type { FC } from 'react';
import { useUIResources } from '@/contexts/UIResourceContext';

type ToolWithSource = MCPTool & { _sourceId?: string };

/**
 * Bridge component that registers a single MCP tool with assistant-ui
 *
 * Handles tool execution and UI resource extraction from tool results.
 */
const McpToolBridge: FC<{
  toolName: string;
  toolDescription: string;
  inputSchema: unknown;
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}> = ({ toolName, toolDescription, inputSchema, callTool }) => {
  const { addResource } = useUIResources();

  useAssistantTool({
    toolName,
    description: toolDescription,
    parameters: inputSchema as Record<string, unknown>,
    execute: async (args) => {
      try {
        const result: CallToolResult = (await callTool(toolName, args)) as CallToolResult;
        result.content.forEach((content) => {
          if (isUIResource(content) && content.resource) {
            addResource({
              toolName: toolName,
              resource: content.resource,
            });
          }
        });
        return result;
      } catch (error) {
        console.error('[McpToolBridge] Tool execution failed:', error);
        throw error;
      }
    },
  });

  return null; // This component only registers the tool
};

/**
 * Tool registry component that registers all MCP and WebMCP tools with assistant-ui
 *
 * Handles both HTTP MCP tools and WebMCP tools from iframes, routing tool calls
 * to the appropriate client based on source ID.
 *
 * @param mcpTools - Tools from HTTP MCP server
 * @param webMcpTools - Tools from WebMCP iframes
 * @param clientRef - Reference to HTTP MCP client
 * @param webMcpClients - Map of WebMCP clients by source ID
 *
 * @example
 * ```tsx
 * <MCPToolRegistry
 *   mcpTools={mcpTools}
 *   webMcpTools={webMcpTools}
 *   clientRef={clientRef}
 *   webMcpClients={webMcpClients}
 * />
 * ```
 */
export const MCPToolRegistry: FC<{
  mcpTools: MCPTool[];
  webMcpTools: MCPTool[];
  clientRef: React.RefObject<Client | null>;
  webMcpClients: React.RefObject<Map<string, Client>>;
}> = ({ mcpTools, webMcpTools, clientRef, webMcpClients }) => {
  return (
    <>
      {/* HTTP MCP Tools */}
      {mcpTools.map((tool) => {
        const sourceId = (tool as ToolWithSource)._sourceId;
        return (
          <McpToolBridge
            key={`${sourceId || 'http'}-${tool.name}`}
            toolName={tool.name}
            toolDescription={tool.description || ''}
            inputSchema={tool.inputSchema}
            callTool={(name, args) => {
              if (!clientRef.current) {
                throw new Error('MCP client not connected');
              }
              return clientRef.current.callTool({ name, arguments: args });
            }}
          />
        );
      })}

      {/* WebMCP Tools */}
      {webMcpTools.map((tool) => {
        const sourceId = (tool as ToolWithSource)._sourceId;
        if (!sourceId) {
          console.warn('[MCPToolRegistry] WebMCP tool missing _sourceId:', tool.name);
          return null;
        }
        return (
          <McpToolBridge
            key={`${sourceId}-${tool.name}`}
            toolName={tool.name}
            toolDescription={tool.description || ''}
            inputSchema={tool.inputSchema}
            callTool={(name, args) => {
              const webMcpClient = webMcpClients.current?.get(sourceId);
              if (!webMcpClient) {
                throw new Error(`WebMCP client not found for source: ${sourceId}`);
              }
              return webMcpClient.callTool({ name, arguments: args });
            }}
          />
        );
      })}
    </>
  );
};
