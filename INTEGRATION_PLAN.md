# MCP-UI Official Specification Integration Plan
## SEP-1865: MCP Apps Integration

**Date**: 2025-11-23
**Repository**: https://github.com/modelcontextprotocol/ext-apps
**Specification**: SEP-1865 - MCP Apps: Interactive User Interfaces for MCP

---

## Executive Summary

The Model Context Protocol has officially adopted MCP Apps as an extension (SEP-1865), standardizing interactive UI capabilities inspired by both MCP-UI and OpenAI's Apps SDK. This document outlines a **clean migration** to align `mcp-ui-webmcp` with the official specification while preserving our unique WebMCP bidirectional tool registration capabilities.

**Migration Philosophy:**
- **Use Official SDK**: Leverage `@modelcontextprotocol/ext-apps` which provides `App` class and `PostMessageTransport`
- **No Backward Compatibility**: Clean cutover to new spec (no dual-mode complexity)
- **8-Week Timeline**: Focused implementation with clear milestones
- **Preserve WebMCP**: Bidirectional tool registration continues to work seamlessly

### Key Changes in Official Spec

1. **Resource Discovery Model**: UI resources are now predeclared and referenced via tool metadata (`_meta['ui/resourceUri']`), not embedded inline in tool results
2. **Standard MCP Protocol**: Communication uses JSON-RPC over postMessage, reusing standard MCP messages
3. **Initialization Pattern**: Replaced custom `iframe-ready` with MCP-like `ui/initialize` → `ui/notifications/initialized`
4. **Content Type Focus**: MVP supports only `text/html+mcp`, deferring `externalUrl` and `remoteDom`
5. **Extension Identifier**: `io.modelcontextprotocol/ui` for capability negotiation
6. **Tool Input Notifications**: New `ui/notifications/tool-input` and `ui/notifications/tool-input-partial` messages

---

## Current vs. Official Implementation Comparison

### Architecture Differences

| Aspect | Current mcp-ui-webmcp | Official SEP-1865 |
|--------|----------------------|-------------------|
| **UI Resource Declaration** | Inline in tool results via `createUIResource()` | Predeclared via `resources/list` + `resources/read` |
| **Tool-UI Linkage** | UI resource embedded in content array | Tool metadata: `_meta['ui/resourceUri']` |
| **Resource Types** | `externalUrl`, `rawHtml`, `remoteDom` | MVP: `text/html+mcp` only |
| **Communication Protocol** | Custom postMessage patterns | Standard MCP JSON-RPC |
| **Initialization** | Custom `iframe-ready` handshake | `ui/initialize` → `ui/notifications/initialized` |
| **SDK Dependencies** | `@mcp-ui/client`, `@mcp-ui/server` | `@modelcontextprotocol/ext-apps` |
| **Data Passing** | Tool results contain UI resource | Tool input via `ui/notifications/tool-input`, results via `ui/notifications/tool-result` |
| **Capability Negotiation** | Implicit | Explicit via `extensions['io.modelcontextprotocol/ui']` |

### What Stays the Same

✅ **WebMCP Bidirectional Tool Registration** - Our core innovation remains unchanged
✅ **Iframe Sandboxing** - Security model is aligned
✅ **React + TypeScript Stack** - Development experience continues
✅ **MCP-B Packages** - `@mcp-b/react-webmcp`, `@mcp-b/transports` remain valuable

---

## Migration Strategy

### Direct Migration to SEP-1865 (No Backward Compatibility Needed)

Clean migration to official specification using `@modelcontextprotocol/ext-apps` SDK.

#### Server-Side Changes

**1.1. Add Extension Capability Negotiation**

```typescript
// In server initialization (apps/mcp-server/worker/mcpServer.ts)
const server = new McpServer(
  {
    name: 'mcp-ui-webmcp-cloudflare',
    version: '2.0.0',
  },
  {
    capabilities: {
      logging: {},
      // NEW: Advertise UI extension support
      extensions: {
        'io.modelcontextprotocol/ui': {
          mimeTypes: ['text/html+mcp']
        }
      }
    }
  }
);
```

**1.2. Register UI Resources**

```typescript
// Register UI resource separately from tools
const tictactoeResource = {
  uri: 'ui://tictactoe-game',
  name: 'tictactoe-game-template',
  description: 'Interactive Tic-Tac-Toe game UI',
  mimeType: 'text/html+mcp',
};

server.registerResource(
  tictactoeResource.name,
  tictactoeResource.uri,
  tictactoeResource,
  async (): Promise<ReadResourceResult> => {
    // Fetch and return the HTML content
    const htmlContent = await fetchTicTacToeHTML(this.env.APP_URL);
    return {
      contents: [{
        uri: tictactoeResource.uri,
        mimeType: 'text/html+mcp',
        text: htmlContent,
        _meta: {
          ui: {
            csp: {
              connect_domains: [], // No external connections needed
              resource_domains: [], // Self-contained
            },
            prefersBorder: true,
          }
        }
      }]
    };
  }
);
```

**1.3. Update Tool Definitions**

```typescript
// Register tool with UI resource metadata
server.registerTool(
  'showTicTacToeGame',
  {
    title: 'Show Tic-Tac-Toe Game',
    description: 'Displays an interactive Tic-Tac-Toe game where you (AI) can play as player O...',
    inputSchema: {},
    // NEW: Link to UI resource via metadata
    _meta: {
      'ui/resourceUri': 'ui://tictactoe-game'
    }
  },
  async () => {
    // Return text content only - UI is loaded from resource
    return {
      content: [{
        type: 'text',
        text: `Tic-Tac-Toe game started. Use tictactoe_get_state to view the board.`
      }]
    };
  }
);
```

**1.4. HTML Content Fetching Helper**

```typescript
// New utility to fetch HTML content for self-hosted apps
async function fetchTicTacToeHTML(appUrl: string): Promise<string> {
  // For self-hosted apps, fetch the built HTML
  const response = await fetch(`${appUrl}/index.html`);
  if (!response.ok) {
    throw new Error(`Failed to fetch UI HTML: ${response.statusText}`);
  }

  const html = await response.text();

  // Inject MCP-B initialization script if needed
  return html.replace(
    '</head>',
    `<script src="${appUrl}/mcp-b-init.js"></script></head>`
  );
}
```

#### Client-Side Changes

**2.1. Add Extension Support to HTTP MCP Client**

```typescript
// In apps/chat-ui/src/hooks/useMCP.ts
const initializeParams = {
  protocolVersion: LATEST_PROTOCOL_VERSION,
  capabilities: {
    // NEW: Advertise UI extension support
    extensions: {
      'io.modelcontextprotocol/ui': {
        mimeTypes: ['text/html+mcp']
      }
    },
    sampling: {},
    experimental: {},
  },
  clientInfo: {
    name: 'mcp-b-chat-ui',
    version: '1.0.0',
  },
};
```

**2.2. Resource Prefetching on Tool Discovery**

```typescript
// When tools are listed, prefetch UI resources
async function prefetchUIResources(tools: Tool[]) {
  const uiTools = tools.filter(tool => tool._meta?.['ui/resourceUri']);

  for (const tool of uiTools) {
    const resourceUri = tool._meta['ui/resourceUri'];
    try {
      // Fetch and cache UI resource
      const resource = await client.request({
        method: 'resources/read',
        params: { uri: resourceUri }
      });

      // Store in resource cache
      resourceCache.set(resourceUri, resource.contents[0]);
    } catch (error) {
      console.warn(`Failed to prefetch UI resource ${resourceUri}:`, error);
    }
  }
}
```

**2.3. Update Iframe Lifecycle for New Protocol**

```typescript
// In apps/chat-ui/src/hooks/useIframeLifecycle.ts

// NEW: Initialize using ui/initialize instead of iframe-ready
async function initializeIframe(iframe: HTMLIFrameElement, toolCallId: string) {
  const transport = new PostMessageTransport(iframe.contentWindow);

  // Wait for ui/initialize request from iframe
  const initRequest = await waitForMessage<McpUiInitializeRequest>(
    (msg) => msg.method === 'ui/initialize'
  );

  // Respond with host context
  await transport.send({
    jsonrpc: '2.0',
    id: initRequest.id,
    result: {
      protocolVersion: '2025-06-18',
      hostInfo: { name: 'mcp-b-chat-ui', version: '1.0.0' },
      hostCapabilities: {
        serverTools: { listChanged: true },
        serverResources: { listChanged: true },
        logging: {},
        openLinks: {},
      },
      hostContext: {
        toolInfo: {
          id: toolCallId,
          tool: currentTool,
        },
        theme: 'dark',
        displayMode: 'inline',
        viewport: {
          width: iframe.clientWidth,
          height: iframe.clientHeight,
        },
        platform: 'web',
      }
    }
  });

  // Wait for initialized notification
  await waitForMessage<McpUiInitializedNotification>(
    (msg) => msg.method === 'ui/notifications/initialized'
  );

  // Send tool input
  await transport.send({
    jsonrpc: '2.0',
    method: 'ui/notifications/tool-input',
    params: {
      arguments: toolCallArguments,
    }
  });

  // Later, send tool result when available
  await transport.send({
    jsonrpc: '2.0',
    method: 'ui/notifications/tool-result',
    params: toolResult,
  });
}
```

**2.4. Resource Rendering**

```typescript
// Render predeclared UI resources
function renderUIResource(
  toolResult: ToolResult,
  tool: Tool
): React.ReactElement {
  const resourceUri = tool._meta?.['ui/resourceUri'];
  if (!resourceUri) {
    return <TextOnlyRenderer content={toolResult.content} />;
  }

  const resource = resourceCache.get(resourceUri);
  if (resource && resource.mimeType === 'text/html+mcp') {
    return <IframeRenderer
      htmlContent={resource.text}
      csp={resource._meta?.ui?.csp}
      prefersBorder={resource._meta?.ui?.prefersBorder}
    />;
  }

  return <TextOnlyRenderer content={toolResult.content} />;
}
```

#### Embedded App Changes

**3.1. Use Official App Class from SDK**

```typescript
// In apps/mcp-server/src/hooks/useParentCommunication.ts

import {
  App,
  PostMessageTransport,
  McpUiToolInputNotificationSchema,
  McpUiToolResultNotificationSchema,
} from '@modelcontextprotocol/ext-apps';

// Use official App class - handles all initialization automatically
const transport = new PostMessageTransport(window.parent, '*');
const app = new App(
  { name: 'TicTacToe App', version: '1.0.0' },  // appInfo
  { experimental: {} },                          // capabilities
  { autoResize: true }                           // options (enables auto size notifications)
);

// Connect automatically does:
// 1. Send ui/initialize request
// 2. Receive host capabilities and context
// 3. Send ui/notifications/initialized
// 4. Set up auto-resize if enabled
await app.connect(transport);

// Access host info after connection
const hostCapabilities = app._hostCapabilities;
const hostInfo = app._hostInfo;

// Listen for tool input (args from tool call)
app.setNotificationHandler(
  McpUiToolInputNotificationSchema,
  async (notification) => {
    const args = notification.params.arguments;
    // Initialize app with arguments
    setGameState(args);
  }
);

// Listen for tool results (when tool execution completes)
app.setNotificationHandler(
  McpUiToolResultNotificationSchema,
  async (notification) => {
    const result = notification.params;
    // Handle tool result if needed
  }
);

// Use built-in methods for communication
await app.callServerTool({ name: 'get-weather', arguments: { city: 'Tokyo' } });
await app.sendMessage({ role: 'user', content: [{ type: 'text', text: 'Hello' }] });
await app.sendLog({ level: 'info', data: 'User clicked button' });
await app.sendOpenLink({ url: 'https://example.com' });

// Size changes are automatic with autoResize: true
// Or manually: app.sendSizeChange({ width: 400, height: 300 });
```

**3.2. Preserve WebMCP Functionality**

WebMCP bidirectional tool registration remains unchanged - it operates independently of the MCP-UI initialization pattern.

```typescript
// WebMCP tools continue to work as before
useWebMCP({
  name: 'tictactoe_move',
  description: 'Make a move at position',
  schema: z.object({ position: z.number().min(0).max(8) }),
  handler: async ({ position }) => {
    // Execute move
    return {
      content: [{ type: 'text', text: `Moved to position ${position}` }]
    };
  }
});
```

---

## Implementation Checklist

### Dependencies

- [ ] Add `@modelcontextprotocol/ext-apps` to all apps that need it
- [ ] Remove `@mcp-ui/client` from chat-ui
- [ ] Remove `@mcp-ui/server` from mcp-server
- [ ] Update package.json files

### Server (apps/mcp-server)

- [ ] Add `io.modelcontextprotocol/ui` extension to capabilities
- [ ] Create resource registration for `ui://` URIs
- [ ] Implement HTML bundling for TicTacToe app (Vite config)
- [ ] Add `_meta['ui/resourceUri']` to tool definitions
- [ ] Remove `createUIResource()` calls - return text only
- [ ] Add CSP metadata to resource contents
- [ ] Update tests to cover new protocol

### Client (apps/chat-ui)

- [ ] Add `io.modelcontextprotocol/ui` to client capabilities
- [ ] Implement resource prefetching on tool discovery
- [ ] Update iframe lifecycle to use `PostMessageTransport` from ext-apps
- [ ] Implement host-side of `ui/initialize` handshake
- [ ] Send `ui/notifications/tool-input` and `ui/notifications/tool-result`
- [ ] Update resource rendering to use `text/html+mcp`
- [ ] Remove dependency on `UIResourceRenderer` from `@mcp-ui/client`
- [ ] Ensure WebMCP integration works with new initialization
- [ ] Add UI for CSP-restricted iframes (show permissions)
- [ ] Update tests to cover new protocol

### Embedded Apps (apps/mcp-server/src)

- [ ] Replace custom initialization with `App` class from ext-apps
- [ ] Remove custom postMessage handling - use `PostMessageTransport`
- [ ] Use `app.connect()` for automatic initialization
- [ ] Listen for `ui/notifications/tool-input`
- [ ] Listen for `ui/notifications/tool-result` (if needed)
- [ ] Use built-in `app.callServerTool()`, `app.sendMessage()`, etc.
- [ ] Enable `autoResize: true` option (or use manual `sendSizeChange()`)
- [ ] Maintain WebMCP tool registration (no changes needed)
- [ ] Handle `ui/resource-teardown` for cleanup
- [ ] Update templates (vanilla & react)

### Templates (apps/create-webmcp-app/templates)

- [ ] Update template server to use resource registration pattern
- [ ] Update template apps to use `App` class from ext-apps
- [ ] Add Vite bundling configuration for single-file HTML output
- [ ] Update documentation and quickstart guides
- [ ] Add examples for CSP metadata usage
- [ ] Remove references to `@mcp-ui/client` and `@mcp-ui/server`

### Documentation

- [ ] Update README.md with new architecture
- [ ] Update architecture diagrams (remove MCP-UI, add ext-apps)
- [ ] Update AGENTS.md with new patterns
- [ ] Add troubleshooting section for bundling
- [ ] Update CONTRIBUTING.md with new patterns
- [ ] Add examples for different use cases

---

## Risk Assessment & Mitigation

### Breaking Changes

**Risk**: Existing deployments will break during migration
**Mitigation**: This is acceptable - we'll do a clean cutover with proper testing

**Risk**: `externalUrl` is deferred in MVP spec (we currently use it for TicTacToe)
**Mitigation**: Bundle apps as self-contained HTML with Vite inline configuration

**Risk**: `remoteDom` is deferred in MVP spec (we use it for some demos)
**Mitigation**: Convert to inline scripts in HTML or propose as future extension

### Technical Challenges

**Challenge**: Bundling React apps as single HTML files
**Solution**: Use Vite with `build.cssCodeSplit: false` and inline assets. Example config:

```typescript
// vite.config.ts
export default {
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 100000000, // Inline all assets
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      }
    }
  },
  plugins: [
    // Custom plugin to inline everything into single HTML
    inlineAssetsPlugin(),
  ]
}
```

**Challenge**: CSP restrictions may block inline scripts
**Solution**: Use `'unsafe-inline'` for MVP as specified, or serve via our Cloudflare Worker with proper CSP headers

**Challenge**: WebMCP transport needs to work with new initialization
**Solution**: WebMCP operates independently - it can initialize after MCP-UI handshake completes

---

## Timeline Recommendation

### Week 1: Setup & Prototyping
- Install `@modelcontextprotocol/ext-apps` dependency
- Create proof-of-concept with TicTacToe using `App` class
- Validate HTML bundling strategy with Vite
- Test end-to-end with simple example

### Week 2-3: Server Implementation
- Replace `@mcp-ui/server` with resource registration
- Add capability negotiation
- Update all tool definitions with `_meta['ui/resourceUri']`
- Implement HTML bundling pipeline for mini-apps
- Add CSP metadata

### Week 4-5: Client Implementation
- Remove `@mcp-ui/client` dependency
- Implement resource prefetching
- Update iframe lifecycle with `PostMessageTransport`
- Implement host-side initialization handshake
- Send tool input/result notifications
- Ensure WebMCP integration works

### Week 6: Embedded Apps & Templates
- Update TicTacToe to use `App` class
- Update template applications
- Update `create-webmcp-app` templates
- Test WebMCP functionality with new initialization

### Week 7: Testing & Documentation
- Comprehensive E2E testing
- Update README, AGENTS.md, architecture docs
- Update all diagrams
- Test deployment to staging

### Week 8: Production Rollout
- Deploy to production
- Monitor for issues
- Gather feedback
- Document any edge cases

---

## Open Questions for Community

1. **External URL Support**: The spec defers `externalUrl` to future versions. Should we:
   - Propose it as a follow-up extension?
   - Convert all external apps to bundled HTML?
   - Maintain as a non-standard extension?

2. **Remote DOM**: Our `remoteDom` pattern is not in the MVP. Should we:
   - Propose as official extension?
   - Convert to inline scripts in HTML?
   - Drop support entirely?

3. **WebMCP Integration**: How should WebMCP tool registration integrate with the official spec?
   - Propose WebMCP as an MCP extension?
   - Keep as independent capability?
   - Submit to W3C for standardization?

4. **Private Tools**: The spec mentions "Private Tools" for UI-only tools. Should we:
   - Wait for SEP defining this?
   - Implement experimental support?
   - Use current workaround (hide from tool list)?

---

## Success Metrics

- ✅ Zero regression in existing WebMCP functionality
- ✅ All tools work with SEP-1865 specification
- ✅ Successfully using `@modelcontextprotocol/ext-apps` SDK
- ✅ All dependencies on `@mcp-ui/*` removed
- ✅ Documentation updated with new architecture
- ✅ Templates updated to use `App` class
- ✅ E2E tests passing with new protocol
- ✅ Performance improvement from resource prefetching
- ✅ Clean HTML bundling working for all mini-apps

---

## References

- **SEP-1865 Specification**: `/tmp/ext-apps/specification/draft/apps.mdx`
- **Official SDK**: https://github.com/modelcontextprotocol/ext-apps
- **Example Implementation**: `/tmp/ext-apps/examples/simple-server/`
- **MCP-UI Legacy Docs**: https://mcpui.dev/
- **WebMCP Specification**: https://github.com/webmachinelearning/webmcp
- **Current Implementation**: This repository (mcp-ui-webmcp)

---

## Conclusion

The official MCP Apps specification (SEP-1865) represents a significant step forward in standardizing interactive UI capabilities in MCP. The migration requires architectural changes but is straightforward thanks to the official `@modelcontextprotocol/ext-apps` SDK which handles most of the complexity.

**Key Benefits of Migration:**
1. **Standards Alignment**: Join the official MCP ecosystem
2. **Better Performance**: Resource prefetching improves load times
3. **Simpler Code**: Use official `App` class instead of custom implementations
4. **Future-Proof**: Stay current with MCP specification evolution
5. **Preserved Innovation**: WebMCP bidirectional tools remain intact and complementary

**Migration Approach:**
- Clean migration without backward compatibility complexity
- Use official SDK's `App` class and `PostMessageTransport`
- Bundle React apps as self-contained HTML
- 8-week timeline with clear milestones
- WebMCP functionality continues to work seamlessly

The core value proposition of **WebMCP bidirectional tool registration** not only remains intact but becomes even more powerful when combined with the official MCP Apps standard. This positions the project as the reference implementation for **MCP Apps + WebMCP integration**.

**Recommended Next Step**: Begin Week 1 setup and prototyping - install `@modelcontextprotocol/ext-apps` and create a proof-of-concept with the TicTacToe app using the official `App` class.
