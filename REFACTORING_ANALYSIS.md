# Chat-UI Refactoring Analysis

## Overview

This document identifies opportunities to break down large components and extract logic into custom hooks, following the modularity principles in CONTRIBUTING.md.

## File Statistics

- **App.tsx**: 672 lines
- **thread.tsx**: 1,212 lines
- **Total**: 1,884 lines to refactor

## Priority 1: App.tsx (672 lines)

### Current Issues

1. **Large component** with multiple responsibilities (MCP connection, WebMCP integration, tool registration)
2. **8+ useState calls** creating complex state management
3. **Complex connection logic** (~100 lines) spread across multiple callbacks
4. **Inline tool registration JSX** (~40 lines) that could be abstracted

### Refactoring Opportunities

#### 1. Custom Hook: `useMCPConnection`

**Extract lines**: 73-180 (connection/disconnection logic)

**Purpose**: Manage MCP server connection state and operations

```typescript
// chat-ui/src/hooks/useMCPConnection.ts
export function useMCPConnection() {
  const [mcpState, setMCPState] = useState<MCPState>('disconnected');
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([]);
  const [mcpPrompts, setMcpPrompts] = useState<MCPPrompt[]>([]);
  const [mcpResources, setMcpResources] = useState<MCPResource[]>([]);

  const clientRef = useRef<Client | null>(null);
  const transportRef = useRef<Transport | null>(null);

  const connectToServer = useCallback(async (url: string) => {
    // Connection logic
  }, []);

  const disconnectFromServer = useCallback(async () => {
    // Disconnection logic
  }, []);

  const callPrompt = useCallback(async (name: string, args?: Record<string, string>) => {
    // Prompt calling logic
  }, []);

  const readResource = useCallback(async (uri: string) => {
    // Resource reading logic
  }, []);

  return {
    mcpState,
    mcpTools,
    mcpPrompts,
    mcpResources,
    connectToServer,
    disconnectFromServer,
    callPrompt,
    readResource,
  };
}
```

**Benefits**:
- Reduces App.tsx by ~100 lines
- Isolates MCP connection logic
- Makes connection logic reusable
- Easier to test

---

#### 2. Custom Hook: `useWebMCPIntegration`

**Extract lines**: 86-233 (WebMCP client/tool management)

**Purpose**: Manage WebMCP iframe clients and dynamic tool registration

```typescript
// chat-ui/src/hooks/useWebMCPIntegration.ts
export function useWebMCPIntegration() {
  const [webMcpTools, setWebMcpTools] = useState<MCPTool[]>([]);
  const webMcpClients = useRef<Map<string, Client>>(new Map());

  const registerWebMcpClient = useCallback((sourceId: string, client: Client) => {
    // Registration logic
  }, []);

  const registerWebMcpTools = useCallback((tools: MCPTool[], sourceId: string) => {
    // Tool registration logic
  }, []);

  const unregisterWebMcpClient = useCallback((sourceId: string) => {
    // Cleanup logic
  }, []);

  const callTool = useCallback(async (
    request: CallToolRequest['params'],
    sourceId?: string
  ): Promise<CallToolResult> => {
    // Tool routing logic
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Close all clients
    };
  }, []);

  return {
    webMcpTools,
    registerWebMcpClient,
    registerWebMcpTools,
    unregisterWebMcpClient,
    callTool,
  };
}
```

**Benefits**:
- Reduces App.tsx by ~60 lines
- Isolates WebMCP logic
- Clear separation between HTTP MCP and WebMCP
- Independent testing

---

#### 3. Separate Component: `MCPToolRegistry`

**Extract lines**: 328-388 (tool registration JSX)

**Purpose**: Handle tool registration and bridge creation

```typescript
// chat-ui/src/components/MCPToolRegistry.tsx
interface MCPToolRegistryProps {
  mcpTools: MCPTool[];
  webMcpTools: MCPTool[];
  clientRef: React.RefObject<Client | null>;
  webMcpClients: React.RefObject<Map<string, Client>>;
}

export const MCPToolRegistry: FC<MCPToolRegistryProps> = ({
  mcpTools,
  webMcpTools,
  clientRef,
  webMcpClients,
}) => {
  return (
    <>
      {mcpTools.map((tool) => (
        <McpToolBridge
          key={`http-${tool.name}`}
          toolName={tool.name}
          toolDescription={tool.description || ''}
          inputSchema={tool.inputSchema}
          callTool={(name, args) => {
            // HTTP tool calling logic
          }}
        />
      ))}
      {webMcpTools.map((tool) => (
        <McpToolBridge
          key={`webmcp-${tool._sourceId}-${tool.name}`}
          toolName={tool.name}
          toolDescription={tool.description || ''}
          inputSchema={tool.inputSchema}
          callTool={(name, args) => {
            // WebMCP tool calling logic
          }}
        />
      ))}
    </>
  );
};
```

**Benefits**:
- Reduces App.tsx by ~60 lines
- Makes tool registration logic testable
- Clearer component structure
- Could add error boundaries here

---

#### 4. Custom Hook: `useAPIKeyModal`

**Extract lines**: 76-78, 322-326 (API key modal state)

**Purpose**: Manage API key modal visibility logic

```typescript
// chat-ui/src/hooks/useAPIKeyModal.ts
export function useAPIKeyModal(mcpState: MCPState) {
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(
    !getStoredApiKey() || mcpState !== 'ready'
  );

  // Auto-show when connection fails or disconnected
  useEffect(() => {
    if (mcpState === 'failed' || mcpState === 'disconnected') {
      setShowApiKeyDialog(true);
    }
  }, [mcpState]);

  return {
    showApiKeyDialog,
    setShowApiKeyDialog,
  };
}
```

**Benefits**:
- Consolidates modal state logic
- Makes auto-show behavior explicit
- Easy to modify modal triggers

---

### App.tsx Summary

**Total Reduction**: ~220 lines (33% reduction)

**New Structure**:
```typescript
// App.tsx (after refactoring - ~450 lines)
function App() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Custom hooks extract all complex logic
  const mcpConnection = useMCPConnection();
  const webMcpIntegration = useWebMCPIntegration();
  const apiKeyModal = useAPIKeyModal(mcpConnection.mcpState);

  const mcpContextValue = useMemo(() => ({
    ...mcpConnection,
    ...webMcpIntegration,
    tools: [...mcpConnection.mcpTools, ...webMcpIntegration.webMcpTools],
  }), [mcpConnection, webMcpIntegration]);

  const runtime = useChatRuntime({ /* config */ });

  return (
    <MCPContext.Provider value={mcpContextValue}>
      <AssistantRuntimeProvider runtime={runtime}>
        <MCPToolRegistry
          mcpTools={mcpConnection.mcpTools}
          webMcpTools={webMcpIntegration.webMcpTools}
          clientRef={mcpConnection.clientRef}
          webMcpClients={webMcpIntegration.webMcpClients}
        />
        {/* UI components */}
      </AssistantRuntimeProvider>
    </MCPContext.Provider>
  );
}
```

---

## Priority 2: thread.tsx (1,212 lines)

### Current Issues

1. **ThreadContent** (170+ lines): Mobile/desktop logic, gestures, scroll management
2. **ToolResponsePanel** (300+ lines): Iframe lifecycle, resize handling, WebMCP setup
3. **Composer** (120+ lines): Tool execution, thread reset, resources display
4. **Complex gesture handling** for mobile swipe navigation
5. **Large iframe onLoad handler** (~80 lines)

### Refactoring Opportunities

#### 1. Custom Hook: `useMobileViewToggle`

**Extract lines**: 179-245 (mobile view management)

**Purpose**: Manage mobile view state, swipe gestures, and scroll preservation

```typescript
// chat-ui/src/hooks/useMobileViewToggle.ts
export function useMobileViewToggle(hasToolSurface: boolean) {
  const [mobileView, setMobileView] = useState<'chat' | 'ui'>('chat');
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);

  const isMobile = useIsMobile();
  const viewportRef = useRef<HTMLDivElement>(null);

  // Auto-switch to UI view on mobile when tool surface appears
  useEffect(() => {
    if (isMobile && hasToolSurface) {
      setMobileView('ui');
    }
  }, [isMobile, hasToolSurface]);

  // Save/restore scroll position when switching views
  useEffect(() => {
    if (!isMobile || !hasToolSurface) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    if (mobileView === 'ui') {
      setSavedScrollPosition(viewport.scrollTop);
    } else if (mobileView === 'chat') {
      viewport.scrollTop = savedScrollPosition;
    }
  }, [mobileView, isMobile, hasToolSurface, savedScrollPosition]);

  // Pan gesture handler for swipe navigation
  const handlePanEnd = useCallback((
    _event: PointerEvent | MouseEvent | TouchEvent,
    info: { offset: { x: number; y: number } }
  ) => {
    if (!isMobile || !hasToolSurface) return;

    const swipeThreshold = 50;
    const { x } = info.offset;

    if (x < -swipeThreshold && mobileView === 'chat') {
      setMobileView('ui');
    } else if (x > swipeThreshold && mobileView === 'ui') {
      setMobileView('chat');
    }
  }, [isMobile, hasToolSurface, mobileView]);

  return {
    mobileView,
    setMobileView,
    viewportRef,
    handlePanEnd,
    isMobile,
  };
}
```

**Benefits**:
- Reduces ThreadContent by ~65 lines
- Isolates mobile interaction logic
- Makes swipe behavior testable
- Clear separation of concerns

---

#### 2. Custom Hook: `useIframeLifecycle`

**Extract lines**: 653-720 (iframe onLoad handler)

**Purpose**: Handle iframe WebMCP setup, tool registration, and cleanup

```typescript
// chat-ui/src/hooks/useIframeLifecycle.ts
export function useIframeLifecycle() {
  const { registerWebMcpClient, registerWebMcpTools, unregisterWebMcpClient } = useMCP();
  const { setResourceCleanup } = useUIResources();

  const setupIframe = useCallback(async (
    iframe: HTMLIFrameElement,
    sourceId: string
  ) => {
    // UI Lifecycle Protocol Handler
    const handleIframeLifecycleMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;

      if (event.data?.type === 'ui-lifecycle-iframe-ready') {
        console.log('[UI Lifecycle] Iframe ready, sending parent-ready signal');
        iframe.contentWindow?.postMessage({ type: 'parent-ready', payload: {} }, '*');
      }
    };

    window.addEventListener('message', handleIframeLifecycleMessage);

    // Create Client + Transport
    const client = new Client({ name: 'WebMCP Client', version: '1.0.0' });
    const transport = new IframeParentTransport({
      targetOrigin: new URL(getStoredServerUrl()).origin,
      iframe: iframe,
    });

    try {
      await client.connect(transport);
      registerWebMcpClient(sourceId, client);

      // Fetch and register tools
      const toolsResponse = await client.listTools();
      registerWebMcpTools(toolsResponse.tools, sourceId);

      // Listen for tool list changes
      client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
        const updated = await client.listTools();
        registerWebMcpTools(updated.tools, sourceId);
      });

      // Store cleanup function
      setResourceCleanup(sourceId, async () => {
        try {
          window.removeEventListener('message', handleIframeLifecycleMessage);
          await client.close();
          await transport.close();
        } catch (error) {
          console.error(`Error closing client/transport for ${sourceId}:`, error);
        }
        unregisterWebMcpClient(sourceId);
      });
    } catch (error) {
      console.error('WebMCP connection failed:', error);
    }
  }, [registerWebMcpClient, registerWebMcpTools, unregisterWebMcpClient, setResourceCleanup]);

  return { setupIframe };
}
```

**Benefits**:
- Reduces ToolResponsePanel by ~70 lines
- Separates iframe setup from rendering
- Makes WebMCP connection testable
- Clearer lifecycle management

---

#### 3. Custom Hook: `useIframeResize`

**Extract lines**: 542-589 (iframe resize handling)

**Purpose**: Handle iframe resize messages and scaling

```typescript
// chat-ui/src/hooks/useIframeResize.ts
export function useIframeResize(iframeRef: React.RefObject<HTMLIFrameElement>) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ui-size-change') {
        const payload = event.data.payload as { height?: number; width?: number };

        if (iframeRef.current) {
          const iframe = iframeRef.current;
          const container = iframe.parentElement;

          if (payload.width !== undefined && payload.height !== undefined && container) {
            const containerWidth = container.clientWidth;
            const targetWidth = containerWidth * 0.95;
            const scale = Math.min(targetWidth / payload.width, 1);

            iframe.style.width = `${payload.width}px`;
            iframe.style.height = `${payload.height}px`;

            if (scale < 1) {
              iframe.style.transform = `scale(${scale})`;
              iframe.style.transformOrigin = 'top center';
              iframe.style.marginBottom = `${payload.height * (scale - 1)}px`;
            } else {
              iframe.style.transform = 'none';
              iframe.style.marginBottom = '0';
            }

            console.log(`📏 Iframe resized: ${payload.width}x${payload.height} (scale: ${scale.toFixed(2)})`);
          } else if (payload.width !== undefined) {
            iframe.style.width = `${payload.width}px`;
            iframe.style.maxWidth = '100%';
          } else if (payload.height !== undefined) {
            iframe.style.height = `${payload.height}px`;
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [iframeRef]);
}
```

**Benefits**:
- Reduces ToolResponsePanel by ~45 lines
- Separates resize logic from rendering
- Makes resize behavior reusable
- Easier to customize scaling

---

#### 4. Separate Component: `MobileViewToggle`

**Extract lines**: 379-419 (mobile toggle bar)

**Purpose**: Mobile view toggle bar UI component

```typescript
// chat-ui/src/components/assistant-ui/mobile-view-toggle.tsx
interface MobileViewToggleProps {
  mobileView: 'chat' | 'ui';
  setMobileView: (view: 'chat' | 'ui') => void;
}

export const MobileViewToggle: FC<MobileViewToggleProps> = ({
  mobileView,
  setMobileView,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: [0.42, 0, 0.58, 1] }}
      className="pointer-events-auto absolute bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm shadow-lg"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="flex items-center justify-around p-1 gap-1 max-[500px]:p-0.5 max-[500px]:gap-0.5">
        <button
          onClick={() => setMobileView('chat')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all',
            mobileView === 'chat'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm font-medium">Chat</span>
        </button>
        <button
          onClick={() => setMobileView('ui')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all',
            mobileView === 'ui'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <Wrench className="h-4 w-4" />
          <span className="text-sm font-medium">Embedded UI</span>
        </button>
      </div>
    </motion.div>
  );
};
```

**Benefits**:
- Reduces ThreadContent by ~40 lines
- Reusable toggle component
- Independent styling/testing
- Clear prop interface

---

#### 5. Custom Hook: `useThreadReset`

**Extract lines**: 877-894 (thread reset logic in Composer)

**Purpose**: Handle conversation reset and cleanup

```typescript
// chat-ui/src/hooks/useThreadReset.ts
export function useThreadReset() {
  const assistantRuntime = useAssistantRuntime();
  const { resources, removeResource } = useUIResources();

  const handleResetThread = useCallback(async () => {
    // Clear the conversation
    const currentState = assistantRuntime.thread.getState();
    if (currentState.isRunning) {
      assistantRuntime.thread.cancelRun();
    }

    // Close all UI resources (iframes)
    for (const resource of resources) {
      await removeResource(resource.id);
    }

    // Start a new thread
    assistantRuntime.thread.import({
      messages: [],
    });
  }, [assistantRuntime, resources, removeResource]);

  return { handleResetThread };
}
```

**Benefits**:
- Reduces Composer by ~15 lines
- Separates reset logic from UI
- Makes reset behavior testable
- Could add confirmation logic here

---

#### 6. Separate Component: `ResourceInfoOverlay`

**Extract lines**: 731-800 (overlay icons in ToolResponsePanel)

**Purpose**: Info/debug overlay for resources

```typescript
// chat-ui/src/components/assistant-ui/resource-info-overlay.tsx
interface ResourceInfoOverlayProps {
  resource: UIResource;
  lastUIAction: UIActionResult | null;
  timestamp: Date;
}

export const ResourceInfoOverlay: FC<ResourceInfoOverlayProps> = ({
  resource,
  lastUIAction,
  timestamp,
}) => {
  return (
    <>
      {/* Bottom Right - Info Icons */}
      <div className="absolute bottom-2 right-2 flex gap-1.5 z-10">
        <ResourceInfoButton resource={resource} timestamp={timestamp} />
        <ResourceJSONButton resource={resource} />
        {lastUIAction && <UIActionButton action={lastUIAction} />}
      </div>

      {/* Bottom Left - Tool Name Badge */}
      <div className="absolute bottom-2 left-2 z-10">
        <div className="px-2 py-1 rounded-full bg-background/95 backdrop-blur-sm border border-border/60 shadow-lg text-xs">
          <p className="font-semibold text-foreground truncate max-w-[120px]">
            {resource.toolName}
          </p>
        </div>
      </div>
    </>
  );
};
```

**Benefits**:
- Reduces ToolResponsePanel by ~70 lines
- Makes overlay independently testable
- Could add more debug info easily
- Clear prop interface

---

### thread.tsx Summary

**Total Reduction**: ~305 lines (25% reduction)

**New Structure**:
```typescript
// thread.tsx (after refactoring - ~900 lines)

// ThreadContent uses custom hooks
const ThreadContent: FC = () => {
  const { resources } = useUIResources();
  const hasToolSurface = resources.length > 0;

  const { mobileView, setMobileView, viewportRef, handlePanEnd, isMobile } =
    useMobileViewToggle(hasToolSurface);

  const isLargeScreen = !isMobile;
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <ToolSurfaceContext.Provider value={{ hasToolSurface, isLargeScreen }}>
      <ThreadPrimitive.Root>
        {hasToolSurface && (
          <ToolResponsePanel />
        )}

        <ChatPanel
          viewportRef={viewportRef}
          handlePanEnd={handlePanEnd}
          mobileView={mobileView}
          hasToolSurface={hasToolSurface}
        />

        {isMobile && hasToolSurface && (
          <MobileViewToggle
            mobileView={mobileView}
            setMobileView={setMobileView}
          />
        )}
      </ThreadPrimitive.Root>
    </ToolSurfaceContext.Provider>
  );
};

// ToolResponsePanel uses custom hooks
const ToolResponsePanel: FC = () => {
  const { selectedResource } = useUIResources();
  const { setupIframe } = useIframeLifecycle();
  useIframeResize(selectedResource?.iframeRef);

  // Simplified rendering logic
};

// Composer uses custom hooks
const Composer: FC = () => {
  const { handleResetThread } = useThreadReset();

  // Simplified UI rendering
};
```

---

## Additional Opportunities

### 7. Extract `TabSelector` to separate file

**Lines**: 88-173

**Benefits**:
- Reduce thread.tsx by ~85 lines
- Independent component testing
- Could be used elsewhere

---

### 8. Custom Hook: `useToolExecution`

**Current**: Tool execution logic scattered across Composer and ToolResponsePanel

**Purpose**: Centralize tool calling logic

```typescript
// chat-ui/src/hooks/useToolExecution.ts
export function useToolExecution() {
  const { callTool } = useMCP();
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<CallToolResult | null>(null);

  const executeToolCall = useCallback(async (
    toolName: string,
    args: Record<string, unknown>,
    sourceId?: string
  ) => {
    setIsExecuting(true);
    try {
      const result = await callTool({ name: toolName, arguments: args }, sourceId);
      setLastResult(result);
      return result;
    } catch (error) {
      console.error('Tool execution failed:', error);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, [callTool]);

  return {
    executeToolCall,
    isExecuting,
    lastResult,
  };
}
```

**Benefits**:
- Consolidates tool execution
- Adds execution state tracking
- Error handling in one place

---

## Implementation Strategy

### Phase 1: App.tsx Refactoring (Week 1)

1. Create `useMCPConnection` hook
2. Create `useWebMCPIntegration` hook
3. Create `MCPToolRegistry` component
4. Create `useAPIKeyModal` hook
5. Update App.tsx to use new hooks
6. Run tests and verify functionality

### Phase 2: thread.tsx Refactoring (Week 2)

1. Create `useMobileViewToggle` hook
2. Create `MobileViewToggle` component
3. Create `useThreadReset` hook
4. Update Composer to use new hook
5. Run tests and verify mobile interactions

### Phase 3: Advanced thread.tsx Refactoring (Week 3)

1. Create `useIframeLifecycle` hook
2. Create `useIframeResize` hook
3. Create `ResourceInfoOverlay` component
4. Extract `TabSelector` to separate file
5. Update ToolResponsePanel to use new hooks
6. Run tests and verify iframe functionality

### Phase 4: Polish & Optimization (Week 4)

1. Create `useToolExecution` hook
2. Add comprehensive JSDoc to all new hooks
3. Add unit tests for hooks
4. Update documentation
5. Performance testing
6. Final code review

---

## Success Metrics

- **App.tsx**: Reduce from 672 → ~450 lines (33% reduction)
- **thread.tsx**: Reduce from 1,212 → ~900 lines (25% reduction)
- **Total reduction**: ~525 lines (28% of original)
- **New hooks created**: 8
- **New components created**: 4
- **Test coverage**: 80%+ for all new hooks
- **No regressions**: All existing functionality preserved

---

## Testing Requirements

### Unit Tests (Vitest)

Each custom hook should have:
- Basic functionality test
- Edge case tests
- Cleanup/unmount tests
- Error handling tests

### Integration Tests (Playwright)

- Mobile swipe navigation still works
- Iframe WebMCP setup still works
- Tool execution still works
- Thread reset still works
- API key modal still works

---

## Alignment with CONTRIBUTING.md

This refactoring follows all core principles:

✅ **Type Safety**: All hooks maintain strict TypeScript types
✅ **Single Source of Truth**: Logic extracted to one location
✅ **Modularity**: Small, focused, reusable modules
✅ **Code Cleanliness**: Self-documenting hooks with JSDoc

---

## Next Steps

1. Review this analysis with the team
2. Prioritize which refactorings to do first
3. Create GitHub issues for each refactoring task
4. Begin Phase 1 implementation
5. Set up unit testing infrastructure (Vitest) if not already present
