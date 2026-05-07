import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type {
  CallToolRequest,
  CallToolResult,
  ClientResult,
  Prompt,
  Resource,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createContext } from 'react';
import type { ElicitationRequest } from '@/components/ElicitationInlineForm';

type PendingElicitation = ElicitationRequest & {
  requestId: string;
  assignedToolCallId?: string;
};

export interface MCPContextValue {
  tools: Tool[];
  prompts: Prompt[];
  resources: Resource[];
  state: 'disconnected' | 'connecting' | 'loading' | 'ready' | 'failed';
  callPrompt: (name: string, args?: Record<string, string>) => Promise<unknown>;
  readResource: (uri: string) => Promise<unknown>;
  callTool: (request: CallToolRequest['params'], sourceId?: string, toolCallId?: string) => Promise<CallToolResult>;
  serverUrl: string | null;
  connectServer: (url: string) => Promise<void>;
  disconnectServer: () => Promise<void>;
  registerWebMcpClient: (sourceId: string, client: Client) => void;
  registerWebMcpTools: (tools: Tool[], sourceId: string) => void;
  unregisterWebMcpClient: (sourceId: string) => void;
  pendingElicitations: Map<string, PendingElicitation>;
  submitElicitation: (requestId: string, result: { action: 'accept' | 'decline' | 'cancel'; data?: ClientResult }) => void;
  assignElicitation: (requestId: string, toolCallId: string) => void;
  registerToolCall: (toolCallId: string, toolName: string) => void;
  unregisterToolCall: (toolCallId: string) => void;
}

export const MCPContext = createContext<MCPContextValue | null>(null);
