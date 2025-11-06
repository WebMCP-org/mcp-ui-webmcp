import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { AssistantChatTransport, useChatRuntime } from '@assistant-ui/react-ai-sdk';
import type {
  CallToolRequest,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { AlertCircle, ExternalLink, Github, Loader2, Menu, Plug, PlugZap, Settings } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiKeyInput } from '@/components/ApiKeyInput';
import { MCPToolRegistry } from '@/components/assistant-ui/mcp-tool-registry';
import { Thread } from '@/components/assistant-ui/thread';
import { ToolSourceBadge } from '@/components/assistant-ui/tool-source-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MCPContext, type MCPContextValue } from '@/contexts/MCPContext';
import { useAPIKeyModal } from '@/hooks/useAPIKeyModal';
import { useMCPConnection } from '@/hooks/useMCPConnection';
import { useWebMCPIntegration } from '@/hooks/useWebMCPIntegration';
import { useQuotaExhausted } from '@/hooks/useQuotaExhausted';
import { QuotaExhaustedModal } from '@/components/QuotaExhaustedModal';

import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { getStoredApiKey, getStoredServerUrl } from '@/lib/storage';
import { getOrCreateDeviceId } from '@/lib/deviceId';

function App() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const mcpConnection = useMCPConnection();
  const webMcpIntegration = useWebMCPIntegration();
  const apiKeyModal = useAPIKeyModal(mcpConnection.mcpState);
  const quotaExhausted = useQuotaExhausted();

  useEffect(() => {
    const storedUrl = getStoredServerUrl();
    if (storedUrl && mcpConnection.mcpState === 'disconnected') {
      mcpConnection.connectToServer(storedUrl);
    }
  }, [mcpConnection]);

  const callTool = useCallback(
    async (request: CallToolRequest['params'], sourceId?: string): Promise<CallToolResult> => {
      if (sourceId) {
        return webMcpIntegration.callTool(request, sourceId);
      }

      if (!mcpConnection.clientRef.current) {
        throw new Error('MCP client not connected');
      }
      try {
        const result = await mcpConnection.clientRef.current.callTool(request);
        return result as CallToolResult;
      } catch (error) {
        console.error('[HTTP Client] Tool call failed:', error);
        throw error;
      }
    },
    [mcpConnection.clientRef, webMcpIntegration]
  );

  const mcpContextValue: MCPContextValue = useMemo(
    () => ({
      tools: [...mcpConnection.mcpTools, ...webMcpIntegration.webMcpTools],
      prompts: mcpConnection.mcpPrompts,
      resources: mcpConnection.mcpResources,
      state: mcpConnection.mcpState,
      callPrompt: mcpConnection.callPrompt,
      readResource: mcpConnection.readResource,
      callTool,
      serverUrl: mcpConnection.mcpState === 'ready' ? 'connected' : null,
      connectServer: mcpConnection.connectToServer,
      disconnectServer: mcpConnection.disconnectFromServer,
      registerWebMcpClient: webMcpIntegration.registerWebMcpClient,
      registerWebMcpTools: webMcpIntegration.registerWebMcpTools,
      unregisterWebMcpClient: webMcpIntegration.unregisterWebMcpClient,
    }),
    [mcpConnection, webMcpIntegration, callTool]
  );

  const runtime = useChatRuntime({
    sendAutomaticallyWhen: (messages) => {
      return lastAssistantMessageIsCompleteWithToolCalls(messages);
    },
    transport: new AssistantChatTransport({
      api: '/api/chat',
      credentials: 'include',
      fetch: async (url, options) => {
        const currentApiKey = getStoredApiKey();
        const deviceId = getOrCreateDeviceId();
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            ...(currentApiKey ? { 'X-Anthropic-API-Key': currentApiKey } : {}),
            'X-Device-ID': deviceId,
          },
        });

        // Check for quota exceeded error
        if (response.status === 429) {
          const clonedResponse = response.clone();
          try {
            const errorData = await clonedResponse.json();
            if (errorData.error === 'Usage quota exceeded') {
              quotaExhausted.triggerQuotaExhausted({
                totalSpent: errorData.totalSpent || 0,
                quotaLimit: errorData.quotaLimit || 1.0,
              });
            }
          } catch (e) {
            // If parsing fails, just return the original response
            console.error('Failed to parse quota error:', e);
          }
        }

        return response;
      },
    }),
  });

  return (
    <MCPContext.Provider value={mcpContextValue}>
      <AssistantRuntimeProvider runtime={runtime}>
        <MCPToolRegistry
          mcpTools={mcpConnection.mcpTools}
          webMcpTools={webMcpIntegration.webMcpTools}
          clientRef={mcpConnection.clientRef}
          webMcpClients={webMcpIntegration.webMcpClients}
        />

        <div className="flex min-h-dvh w-full flex-col bg-gradient-to-br from-background via-background to-muted/20">
          <header className="z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-[env(safe-area-inset-top)]">
            <div className="flex h-12 items-center justify-between gap-1.5 px-2 sm:h-14 sm:gap-3 sm:px-4 md:h-16 md:gap-4 md:px-6 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] md:pl-[max(1.5rem,env(safe-area-inset-left))] md:pr-[max(1.5rem,env(safe-area-inset-right))]">
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 md:gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:h-8 sm:w-8 md:h-10 md:w-10">
                  <PlugZap className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4 md:h-5 md:w-5" />
                </div>
                <h1 className="truncate text-xs font-semibold tracking-tight sm:text-sm md:text-base lg:text-lg">
                  webMCP + mcp-ui
                </h1>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 rounded-full shadow-sm md:hidden"
                    >
                      <Menu className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                    <SheetHeader className="mb-6">
                      <SheetTitle>Navigation</SheetTitle>
                    </SheetHeader>

                    <div className="flex flex-col gap-4 mb-6">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Links
                      </h3>
                      <nav className="flex flex-col gap-3">
                        <a
                          href="https://github.com/WebMCP-org/mcp-ui-webmcp"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
                          onClick={() => setShowMobileMenu(false)}
                        >
                          GitHub
                          <Github className="h-4 w-4" />
                        </a>
                        <a
                          href="https://mcp-b.ai"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
                          onClick={() => setShowMobileMenu(false)}
                        >
                          MCP-B
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <a
                          href="https://docs.mcp-b.ai/building-mcp-ui-apps"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
                          onClick={() => setShowMobileMenu(false)}
                        >
                          View Docs
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <a
                          href="https://www.linkedin.com/in/alex-nahas/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
                          onClick={() => setShowMobileMenu(false)}
                        >
                          Contact me
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </nav>
                    </div>

                    <div className="flex flex-col gap-4 pt-4 border-t">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Tool Sources
                      </h3>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <ToolSourceBadge sourceId={undefined} />
                          <span className="text-xs text-muted-foreground">Remote MCP Server</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ToolSourceBadge sourceId="webmcp" />
                          <span className="text-xs text-muted-foreground">Client JavaScript</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Tools can come from the remote MCP server (HTTP) or run directly in your
                        browser via WebMCP.
                      </p>
                    </div>
                  </SheetContent>
                </Sheet>

                <div className="hidden items-center gap-2 border-r pr-3 md:flex">
                  <a
                    href="https://github.com/WebMCP-org/mcp-ui-webmcp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    GitHub
                    <Github className="h-3 w-3" />
                  </a>
                  <a
                    href="https://mcp-b.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    MCP-B
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href="https://docs.mcp-b.ai/building-mcp-ui-apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    View Docs
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href="https://www.linkedin.com/in/alex-nahas/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Contact me
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="hidden items-center gap-2 border-r pr-3 lg:flex">
                        <span className="text-xs font-medium text-muted-foreground">
                          Tool Sources:
                        </span>
                        <ToolSourceBadge sourceId={undefined} className="text-xs px-1.5 py-0" />
                        <ToolSourceBadge sourceId="webmcp" className="text-xs px-1.5 py-0" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold">Tool Source Types:</p>
                        <p className="text-xs">
                          🔵 <strong>Remote MCP:</strong> Tools from HTTP MCP server
                        </p>
                        <p className="text-xs">
                          🟢 <strong>WebMCP:</strong> Tools that run in client JavaScript
                        </p>
                        <p className="text-xs text-muted-foreground ml-4">
                          No external servers required
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  {mcpConnection.mcpState === 'ready' ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <output
                          className="flex items-center gap-1.5 rounded-lg border border-green-500/50 bg-green-500/10 px-2 py-1.5 sm:gap-2 sm:px-3 cursor-pointer"
                          aria-live="polite"
                        >
                          <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-green-500" />
                          <span className="hidden text-xs font-medium text-green-700 dark:text-green-400 sm:inline sm:text-sm">
                            Connected
                          </span>
                          <div className="hidden gap-1 sm:flex">
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                              {mcpConnection.mcpTools.length}
                            </Badge>
                          </div>
                          <span className="text-xs font-medium text-green-700 dark:text-green-400 sm:hidden">
                            {mcpConnection.mcpTools.length}
                          </span>
                        </output>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          MCP server connected ({mcpConnection.mcpTools.length} tools available)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ) : mcpConnection.mcpState === 'connecting' || mcpConnection.mcpState === 'loading' ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <output
                          className="flex items-center gap-1.5 rounded-lg border border-blue-500/50 bg-blue-500/10 px-2 py-1.5 sm:gap-2 sm:px-3 cursor-pointer"
                          aria-live="polite"
                        >
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-blue-500 sm:h-4 sm:w-4" />
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-400 sm:text-sm">
                            {mcpConnection.mcpState === 'connecting' ? 'Connecting...' : 'Loading...'}
                          </span>
                        </output>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Establishing connection to MCP server...</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : mcpConnection.mcpState === 'failed' ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <output
                          className="flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-500/10 px-2 py-1.5 sm:gap-2 sm:px-3 cursor-pointer"
                          aria-live="polite"
                        >
                          <AlertCircle className="h-3 w-3 shrink-0 text-red-500 sm:h-4 sm:w-4" />
                          <span className="text-xs font-medium text-red-700 dark:text-red-400 sm:text-sm">
                            Failed
                          </span>
                        </output>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Connection failed. Click Settings to try again.</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <output
                          className="flex items-center gap-1.5 rounded-lg border border-muted bg-muted/20 px-2 py-1.5 sm:gap-2 sm:px-3 cursor-pointer"
                          aria-live="polite"
                        >
                          <Plug className="h-3 w-3 shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
                          <span className="text-xs font-medium text-muted-foreground sm:text-sm">
                            Not Connected
                          </span>
                        </output>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">No server configured. Click Settings to connect.</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TooltipProvider>

                {!getStoredApiKey() && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => apiKeyModal.setShowApiKeyDialog(true)}
                          className="shrink-0 rounded-full hover:bg-blue-500/10"
                        >
                          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                            Using Free Quota
                          </p>
                          <p className="text-xs">
                            You have $1.00 of free usage.
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Click to add API key for unlimited access.
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => apiKeyModal.setShowApiKeyDialog(true)}
                        className="shrink-0 rounded-full shadow-sm"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Configure API key and MCP server connection</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-hidden">
            <div className="flex h-full w-full flex-col">
              <Thread />
            </div>
          </div>

          <ApiKeyInput
            open={apiKeyModal.showApiKeyDialog}
            onClose={() => apiKeyModal.setShowApiKeyDialog(false)}
            onConnectServer={mcpConnection.connectToServer}
            onDisconnectServer={mcpConnection.disconnectFromServer}
            connectionState={mcpConnection.mcpState}
          />

          {quotaExhausted.quotaInfo && (
            <QuotaExhaustedModal
              open={quotaExhausted.showQuotaModal}
              totalSpent={quotaExhausted.quotaInfo.totalSpent}
              quotaLimit={quotaExhausted.quotaInfo.quotaLimit}
              onAddApiKey={() => {
                quotaExhausted.closeQuotaModal();
                apiKeyModal.setShowApiKeyDialog(true);
              }}
            />
          )}
        </div>
      </AssistantRuntimeProvider>
    </MCPContext.Provider>
  );
}

export default App;
