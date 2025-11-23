# MCP-UI Official Specification Integration Plan
## SEP-1865: MCP Apps Integration

**Date**: 2025-11-23
**Repository**: https://github.com/modelcontextprotocol/ext-apps
**Specification**: SEP-1865 - MCP Apps: Interactive User Interfaces for MCP

---

## Executive Summary

The Model Context Protocol has officially adopted MCP Apps as an extension (SEP-1865), standardizing interactive UI capabilities inspired by both MCP-UI and OpenAI's Apps SDK. This document outlines a migration plan to align `mcp-ui-webmcp` with the official specification while preserving our unique WebMCP bidirectional tool registration capabilities.

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

### Phase 1: Dual-Mode Support (Recommended)

Support both legacy MCP-UI and new SEP-1865 patterns simultaneously to enable gradual migration.

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
// Link tool to UI resource via metadata
server.tool(
  'showTicTacToeGame',
  'Displays an interactive Tic-Tac-Toe game...',
  {},
  async () => {
    // Check if client supports new spec
    const supportsNewSpec = clientCapabilities?.extensions?.['io.modelcontextprotocol/ui'];

    if (supportsNewSpec) {
      // NEW: Return text content only, UI referenced via metadata
      return {
        content: [{
          type: 'text',
          text: 'Tic-Tac-Toe game started. Use tictactoe_get_state to view the board.'
        }],
        // Tool metadata handled during registration
      };
    } else {
      // LEGACY: Return inline UI resource
      const uiResource = createUIResource({
        uri: 'ui://tictactoe-game',
        content: { type: 'externalUrl', iframeUrl: `${this.env.APP_URL}/` },
        encoding: 'blob',
      });
      return { content: [{ type: 'text', text: '...' }, uiResource] };
    }
  }
);

// Add metadata during tool registration
server.tools.get('showTicTacToeGame')._meta = {
  'ui/resourceUri': 'ui://tictactoe-game'
};
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

**2.4. Dual-Mode Resource Rendering**

```typescript
// Handle both inline and predeclared resources
function renderUIResource(
  toolResult: ToolResult,
  tool: Tool
): React.ReactElement {
  // NEW: Check for predeclared resource
  const resourceUri = tool._meta?.['ui/resourceUri'];
  if (resourceUri) {
    const resource = resourceCache.get(resourceUri);
    if (resource && resource.mimeType === 'text/html+mcp') {
      return <IframeRenderer htmlContent={resource.text} />;
    }
  }

  // LEGACY: Check for inline resource in content
  const uiContent = toolResult.content.find(
    (c) => c.type === 'resource' && c.resource?.uri.startsWith('ui://')
  );

  if (uiContent) {
    return <UIResourceRenderer resource={uiContent.resource} />;
  }

  return <TextOnlyRenderer content={toolResult.content} />;
}
```

#### Embedded App Changes

**3.1. Update Initialization in React Apps**

```typescript
// In apps/mcp-server/src/hooks/useParentCommunication.ts

import { App } from '@modelcontextprotocol/ext-apps/app';
import { PostMessageTransport } from '@modelcontextprotocol/ext-apps/message-transport';

// NEW: Use official App class for initialization
const transport = new PostMessageTransport(window.parent, '*');
const app = new App(
  {
    name: 'TicTacToe App',
    version: '1.0.0'
  },
  {
    experimental: {}
  }
);

await app.connect(transport);

// NEW: Send ui/initialize request
const initResult = await app.request({
  method: 'ui/initialize',
  params: {
    protocolVersion: '2025-06-18',
    appInfo: { name: 'TicTacToe App', version: '1.0.0' },
    appCapabilities: { experimental: {} },
  }
});

// Host context is available in initResult.hostContext
const { theme, viewport, toolInfo } = initResult.hostContext;

// NEW: Send initialized notification
await app.notification({
  method: 'ui/notifications/initialized',
  params: {}
});

// NEW: Listen for tool input
app.setNotificationHandler(
  McpUiToolInputNotificationSchema,
  async (notification) => {
    const args = notification.params.arguments;
    // Initialize app with arguments
  }
);

// NEW: Listen for tool results
app.setNotificationHandler(
  McpUiToolResultNotificationSchema,
  async (notification) => {
    const result = notification.params;
    // Handle tool result
  }
);
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

### Phase 2: Full Migration (Future)

Once Phase 1 is stable and tested:

1. **Remove Legacy Support**: Drop `@mcp-ui/client` and `@mcp-ui/server` dependencies
2. **Migrate to `text/html+mcp`**: Convert all UI resources to self-contained HTML
3. **Bundle Apps**: Build mini-apps as single HTML files with inline scripts/styles
4. **Update Templates**: Modify `create-webmcp-app` templates to use new patterns
5. **Documentation**: Update all docs to reflect new specification

---

## Implementation Checklist

### Server (apps/mcp-server)

- [ ] Add `io.modelcontextprotocol/ui` extension to capabilities
- [ ] Create resource registration helpers for `ui://` URIs
- [ ] Implement HTML content fetching/bundling for mini-apps
- [ ] Add `_meta['ui/resourceUri']` to tool definitions
- [ ] Support dual-mode: detect client capabilities and respond accordingly
- [ ] Add CSP metadata to resource contents
- [ ] Implement resource caching/optimization
- [ ] Update tests to cover new protocol

### Client (apps/chat-ui)

- [ ] Add `io.modelcontextprotocol/ui` to client capabilities
- [ ] Implement resource prefetching on tool discovery
- [ ] Update iframe lifecycle for `ui/initialize` handshake
- [ ] Add tool input/result notification sending
- [ ] Implement dual-mode resource rendering
- [ ] Add PostMessageTransport wrapper using `@modelcontextprotocol/ext-apps`
- [ ] Update WebMCP integration to work with new initialization
- [ ] Add UI for CSP-restricted iframes (show permissions)
- [ ] Update tests to cover new protocol

### Embedded Apps (apps/mcp-server/src)

- [ ] Replace custom initialization with official `App` class
- [ ] Update to use `ui/initialize` → `ui/notifications/initialized`
- [ ] Listen for `ui/notifications/tool-input` and `ui/notifications/tool-result`
- [ ] Maintain WebMCP tool registration (no changes needed)
- [ ] Add `ui/notifications/size-change` reporting
- [ ] Handle `ui/resource-teardown` for cleanup
- [ ] Test with sandbox proxy architecture
- [ ] Update templates (vanilla & react)

### Templates (apps/create-webmcp-app/templates)

- [ ] Update template server to use new resource pattern
- [ ] Update template apps to use official SDK
- [ ] Add bundling configuration for single-file HTML output
- [ ] Update documentation and quickstart guides
- [ ] Add examples for CSP metadata usage

### Documentation

- [ ] Create migration guide for existing projects
- [ ] Update architecture diagrams
- [ ] Document dual-mode operation
- [ ] Add troubleshooting section for common migration issues
- [ ] Update CONTRIBUTING.md with new patterns
- [ ] Add examples for different use cases

---

## Risk Assessment & Mitigation

### Breaking Changes

**Risk**: Existing deployments break if we switch completely
**Mitigation**: Phase 1 dual-mode support maintains backward compatibility

**Risk**: `externalUrl` is deferred in MVP spec
**Mitigation**: Bundle apps as self-contained HTML with our Cloudflare Worker serving them

**Risk**: `remoteDom` is deferred in MVP spec
**Mitigation**: Consider proposing `remoteDom` as a future extension, or convert to inline scripts in HTML

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

### Week 1-2: Research & Prototyping
- Set up ext-apps SDK locally
- Create proof-of-concept with single tool
- Validate bundling strategy for HTML apps
- Test dual-mode compatibility

### Week 3-4: Server Implementation
- Implement resource registration
- Add capability negotiation
- Update tool definitions
- Create HTML bundling pipeline

### Week 5-6: Client Implementation
- Update iframe lifecycle
- Add resource prefetching
- Implement dual-mode rendering
- Update WebMCP integration

### Week 7-8: Embedded Apps & Templates
- Migrate TicTacToe app
- Update templates
- Test WebMCP functionality
- Create migration examples

### Week 9-10: Testing & Documentation
- Comprehensive E2E testing
- Update all documentation
- Create migration guide
- Deploy to staging

### Week 11-12: Production Rollout
- Deploy to production with dual-mode
- Monitor for issues
- Gather feedback
- Iterate on improvements

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
- ✅ Successful dual-mode operation with both legacy and new clients
- ✅ All tools work with SEP-1865 compliant clients
- ✅ Documentation updated and migration guide published
- ✅ Templates updated to use new patterns
- ✅ E2E tests passing for both modes
- ✅ Performance improvement from resource prefetching

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

The official MCP Apps specification (SEP-1865) represents a significant step forward in standardizing interactive UI capabilities in MCP. While it requires architectural changes to our current implementation, the core value proposition of **WebMCP bidirectional tool registration** remains intact and complementary.

By adopting a phased approach with dual-mode support, we can:
1. Align with the official standard
2. Maintain backward compatibility during transition
3. Preserve our unique WebMCP innovations
4. Continue serving as a reference implementation for the community

The migration is substantial but achievable, with clear benefits in terms of interoperability, performance (resource prefetching), and long-term maintainability as the ecosystem adopts the standard.

**Recommended Next Step**: Begin Week 1-2 prototyping to validate the technical approach and bundling strategy before committing to full migration.
