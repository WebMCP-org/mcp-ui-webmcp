# Architecture Documentation

Technical architecture of the MCP UI + WebMCP starter.

## Overview

This starter combines three technologies:

1. **MCP (Model Context Protocol)**: Standardized protocol for AI assistants to interact with services
2. **MCP UI**: Extension allowing servers to return interactive UI components
3. **WebMCP**: Browser-based protocol for embedded apps to register tools back to the MCP server

Result: **Bidirectional integration** where:
- AI assistants can display interactive web UIs
- UIs can dynamically register tools for the AI to use

## System Architecture

```
┌─────────────────────────────────────────┐
│          AI Assistant                    │
│  ┌──────────────────────────────────┐   │
│  │  MCP Client                      │   │
│  │  - Calls showTicTacToeGame       │   │
│  │  - Receives iframe URL            │   │
│  │  - Gets tools from WebMCP        │   │
│  └──────────────────────────────────┘   │
└────────────┬────────────────────────────┘
             │ HTTP/SSE
             ↓
┌─────────────────────────────────────────┐
│      Cloudflare Worker                   │
│  ┌──────────────────────────────────┐   │
│  │  Hono Router (worker/index.ts)   │   │
│  │  - /mcp → MCP protocol           │   │
│  │  - /sse → Server-sent events     │   │
│  │  - / → TicTacToe app (static)    │   │
│  │  - /api/stats → Stats endpoints  │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  MyMCP (Durable Object)          │   │
│  │  - MCP server implementation     │   │
│  │  - 5 tools registered            │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  GameStatsStorage (DO)           │   │
│  │  - WebSocket connections         │   │
│  │  - Real-time stats tracking      │   │
│  └──────────────────────────────────┘   │
└────────────┬────────────────────────────┘
             │ Serves iframe
             ↓
┌─────────────────────────────────────────┐
│      TicTacToe App (iframe)             │
│  ┌──────────────────────────────────┐   │
│  │  React App (src/main.tsx)        │   │
│  │  - Initializes WebMCP            │   │
│  │  - Renders TicTacToeWithWebMCP   │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  WebMCP (useWebMCP hook)         │   │
│  │  - Registers 3 tools             │   │
│  │  - Handles tool calls            │   │
│  │  - Returns results via postMsg   │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Component Details

### 1. Worker Entry Point (worker/index.ts)

**Responsibilities:**
- Route HTTP requests using Hono
- Serve MCP protocol endpoints
- Serve static TicTacToe app
- Handle game statistics API

**Key Routes:**
```typescript
// MCP Protocol
app.all('/mcp', ...) → MyMCP.serve()
app.all('/sse/*', ...) → MyMCP.serveSSE()

// Game Statistics API
app.get('/api/stats', ...) → GameStatsStorage
app.get('/api/stats/ws', ...) → GameStatsStorage (WebSocket)
app.post('/api/stats/game-complete', ...) → GameStatsStorage

// 404 Handler
app.notFound(...) → JSON error response
```

**Why Hono?**
- Lightweight (~12KB) and fast
- Built for edge runtimes
- Clean routing API with CORS support
- Type-safe with TypeScript

### 2. MCP Server (worker/mcpServer.ts)

Extends `McpAgent` from the `agents` library which handles:
- Durable Object lifecycle
- HTTP/SSE transport
- Session management
- Request routing

**Tools Registered:**
1. `showExternalUrl` - Display external website in iframe
2. `showRawHtml` - Render raw HTML content
3. `showRemoteDom` - Execute JavaScript to build DOM
4. `showTicTacToeGame` - Launch TicTacToe game (WebMCP enabled)
5. `tictactoe_get_stats` - Get global game statistics

**Prompts Registered:**
- `PlayTicTacToe` - Pre-configured prompt to start a game

### 3. GameStatsStorage (Durable Object)

Real-time statistics tracking using WebSocket and Durable Objects.

**Features:**
- WebSocket hibernation support (cost-effective)
- Live game counting via connection tracking
- Automatic stats broadcasting to all connected clients
- Tracks: Clankers wins, Carbon Units wins, draws, live games

**Endpoints:**
- `GET /stats` - Get current statistics
- `POST /game-complete` - Record game result
- WebSocket upgrade - Real-time updates

### 4. TicTacToe React App (src/)

**Architecture:**
```
src/
├── main.tsx                      # Entry point, initializes WebMCP
├── TicTacToe.tsx                 # Pure game component (no WebMCP)
├── TicTacToeWithWebMCP.tsx       # WebMCP integration layer
├── ErrorBoundary.tsx             # Error handling
└── lib/utils.ts                  # Utility functions
```

**Separation of Concerns:**
- `TicTacToe.tsx` - Pure, reusable game logic (can work standalone)
- `TicTacToeWithWebMCP.tsx` - WebMCP wrapper that registers tools

This allows:
- Easier testing (pure component)
- Reusability (use TicTacToe without WebMCP)
- Clear separation of concerns

### 5. WebMCP Integration

**Initialization (src/main.tsx):**
```typescript
import { initializeWebModelContext } from '@mcp-b/global';

// MUST be called BEFORE React renders
initializeWebModelContext({
  transport: {
    tabServer: {
      allowedOrigins: ['*'],
      // postMessageTarget defaults to window.parent
    },
  },
});
```

**Tool Registration (src/TicTacToeWithWebMCP.tsx):**
```typescript
import { useWebMCP } from '@mcp-b/react-webmcp';
import { z } from 'zod';

useWebMCP({
  name: "tictactoe_ai_move",
  description: "Make a move as the AI player",
  inputSchema: {
    position: z.number().min(0).max(8)
  },
  handler: async ({ position }) => {
    // Game logic executes here
    const result = performMove(position, agentPlayer);
    return formatMoveMarkdown(result);
  }
});
```

**Tools Registered by TicTacToe:**
1. `tictactoe_get_state` - Get current board state
2. `tictactoe_ai_move` - Make a move (AI player)
3. `tictactoe_reset` - Reset the game

## Communication Protocols

### MCP Protocol Flow

1. AI calls `showTicTacToeGame` tool
2. MCP server returns UI resource with iframe URL (`APP_URL/`)
3. AI assistant displays iframe
4. TicTacToe app loads and initializes WebMCP
5. TicTacToe registers tools via `useWebMCP`
6. AI receives tool registrations
7. AI can now call `tictactoe_*` tools

### WebMCP postMessage Protocol

**Tool Registration (iframe → parent):**
```typescript
{
  type: "webmcp-tool-register",
  tool: {
    name: "tictactoe_ai_move",
    description: "...",
    inputSchema: { /* Zod schema */ }
  }
}
```

**Tool Call (parent → iframe):**
```typescript
{
  type: "webmcp-tool-call",
  toolName: "tictactoe_ai_move",
  params: { position: 4 },
  callId: "unique-id"
}
```

**Tool Result (iframe → parent):**
```typescript
{
  type: "webmcp-tool-result",
  callId: "unique-id",
  result: "Markdown formatted result"
}
```

### Parent Readiness Protocol

The iframe handles multiple readiness signals to ensure reliable communication:

```typescript
// Iframe sends on load
{ type: 'ui-lifecycle-iframe-ready' }

// Parent may respond with any of:
{ type: 'parent-ready' }
{ type: 'ui-lifecycle-iframe-render-data' }
{ type: 'ui-message-response', payload: { status: 'ready' } }
```

This prevents race conditions where tools are registered before the parent is listening.

### Size Notification Protocol

The iframe notifies the parent of its dimensions for proper sizing:

```typescript
{
  type: 'ui-size-change',
  payload: {
    width: 800,
    height: 600
  }
}
```

Sent:
- Once on initial load
- (Could be sent on resize if needed)

## Build System

### Vite Configuration

Single-entry build with multiple plugins:

```typescript
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'] // React 19 compiler
      }
    }),
    tailwindcss(),    // Tailwind CSS v4
    cloudflare()       // Cloudflare Workers integration
  ],
  server: {
    port: 8888,
    strictPort: true
  }
});
```

### Build Outputs

**Development (`pnpm dev`):**
- Vite dev server at `http://localhost:8888`
- Hot module replacement (HMR)
- Cloudflare Workers local simulation

**Production (`pnpm build`):**
1. `tsc -b` - TypeScript compilation
2. `vite build` - Creates two bundles:
   - `dist/client/` - TicTacToe web app (HTML, CSS, JS)
   - `dist/mcp_ui_with_webmcp_my_mcp_server/` - Cloudflare Worker bundle

### Deployment

```bash
pnpm deploy
```

Runs `deploy.sh` which:
1. Runs `pnpm build`
2. Loads `.prod.vars` environment variables
3. Deploys to Cloudflare Workers with `wrangler deploy`

## Runtime Behavior

### Development Flow

1. `pnpm dev` starts Vite + Cloudflare Workers local
2. Visit `http://localhost:8888/` → TicTacToe app
3. Visit `http://localhost:8888/mcp` → MCP endpoint
4. Connect AI assistant to `http://localhost:8888/mcp`
5. Call `showTicTacToeGame` → loads iframe from same origin

### Production Flow

1. Deploy to Cloudflare Workers
2. Worker serves at `https://your-worker.workers.dev`
3. MCP endpoint at `/mcp`
4. TicTacToe app served from root `/`
5. Iframe URL uses `APP_URL` from `.prod.vars`

### Environment Variables

**`.dev.vars` (development):**
```env
APP_URL=http://localhost:8888
```

**`.prod.vars` (production):**
```env
APP_URL=https://your-worker.workers.dev
# Or custom domain:
APP_URL=https://beattheclankers.com
```

The MCP server uses `APP_URL` to construct iframe URLs that work in any environment.

## Design Decisions

### Why Durable Objects?

**For MCP Server:**
- Session persistence across requests
- Multiple AI clients can share state
- Automatic scaling per client

**For GameStatsStorage:**
- Centralized statistics storage
- WebSocket connection management
- Atomic updates to stats

### Why Single App Architecture?

This starter intentionally uses a simple single-app architecture:
- **Easier to understand** - Less abstraction
- **Easier to customize** - Modify one app, not a platform
- **Still extensible** - Can add more apps as separate workers if needed

For multi-app platforms, consider:
- Separate Cloudflare Workers per app
- Monorepo with shared packages
- Turborepo for orchestration

### Why Separate TicTacToe Components?

**TicTacToe.tsx** (Pure component):
- No WebMCP dependency
- Can be used in any React app
- Easy to test
- Controlled/uncontrolled modes

**TicTacToeWithWebMCP.tsx** (Integration layer):
- Wraps pure component
- Handles WebMCP registration
- Manages parent communication
- Tracks AI/human roles

This pattern is recommended for complex UI components.

### Why TabServer Transport?

TabServer is the WebMCP transport for iframe communication:
- Uses `postMessage` API (standard browser API)
- Works in any modern browser
- No WebSocket needed (simplifies deployment)
- Handles bidirectional communication

Alternative transports:
- **HttpServer** - For standalone servers
- **StdioServer** - For CLI tools
- **Custom** - Build your own transport

## Performance Considerations

### Cloudflare Workers

- **Cold start**: ~5-10ms (minimal)
- **Edge location**: Runs close to users
- **Durable Objects**: Slightly higher latency (centralized) but worth it for state
- **WebSocket hibernation**: Reduces costs for idle connections

### React Compiler

The starter uses React 19's experimental compiler:
- Automatic memoization
- Reduced re-renders
- No need for `useMemo`/`useCallback`

Enable in `vite.config.ts`:
```typescript
react({
  babel: {
    plugins: ['babel-plugin-react-compiler']
  }
})
```

### Bundle Size

Production build sizes:
- TicTacToe app: ~450KB (includes React 19, WebMCP, Tailwind)
- Worker bundle: ~800KB (includes Hono, MCP SDK, agents)

Optimization tips:
- Tree-shaking works automatically
- Tailwind purges unused CSS
- Vite code-splits automatically

## Security Considerations

### CORS Configuration

Worker uses wildcard CORS for development:
```typescript
cors({
  origin: '*',
  allowHeaders: ['*'],
  allowMethods: ['*']
})
```

For production, tighten this:
```typescript
cors({
  origin: 'https://your-ai-assistant.com',
  allowHeaders: ['Content-Type', 'X-Anthropic-API-Key'],
  allowMethods: ['GET', 'POST']
})
```

### postMessage Security

TabServer accepts messages from any origin (`allowedOrigins: ['*']`).

For production, specify allowed origins:
```typescript
initializeWebModelContext({
  transport: {
    tabServer: {
      allowedOrigins: ['https://your-ai-assistant.com']
    }
  }
});
```

### Environment Variables

`.dev.vars` and `.prod.vars` are **committed to git** because they contain:
- Public URLs only
- No secrets

For actual secrets (API keys), use:
- Cloudflare Workers secrets: `wrangler secret put SECRET_NAME`
- `.vars.local` files (gitignored)

## Troubleshooting

### Tools Not Appearing

1. Check WebMCP initialization happens before React renders
2. Verify `allowedOrigins` includes the AI assistant's origin
3. Check browser console for WebMCP errors
4. Ensure parent window is ready (check readiness protocol)

### Iframe Not Loading

1. Verify `APP_URL` in `.dev.vars` or `.prod.vars`
2. Check CORS configuration
3. Ensure static assets are built (`pnpm build`)
4. Check worker logs (`wrangler tail`)

### Build Failures

1. Run `pnpm typecheck` to check TypeScript errors
2. Clear build cache: `rm -rf dist/ node_modules/.vite/`
3. Reinstall dependencies: `pnpm install`

### WebSocket Connection Failures

1. Check Durable Object bindings in `wrangler.jsonc`
2. Verify WebSocket upgrade headers
3. Check browser console for WebSocket errors
4. Ensure GameStatsStorage is deployed

## Additional Resources

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [WebMCP Documentation](https://github.com/WebMCP-org)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Durable Objects Docs](https://developers.cloudflare.com/durable-objects/)
- [Hono Documentation](https://hono.dev/)
- [React 19 Release](https://react.dev/blog/2024/12/05/react-19)

---

This architecture balances simplicity with real-world production patterns. It's designed to be a starter, not a framework.
