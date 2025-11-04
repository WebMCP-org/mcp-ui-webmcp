# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **monorepo demonstrating MCP UI + WebMCP integration** - a dual-direction integration pattern where:
1. **MCP Server → UI**: AI assistants invoke tools that display interactive web applications
2. **UI → MCP Server**: Embedded web apps dynamically register tools back to the AI via iframe postMessage

The key innovation is bidirectional communication: the AI can show UIs, and those UIs can extend the AI's capabilities by registering new tools.

## Monorepo Structure

Three main packages managed by Turborepo + pnpm:

- **chat-ui**: Modern React chat interface that connects to MCP servers and displays interactive UI resources
- **remote-mcp-with-ui-starter**: MCP server with embedded web UIs using Cloudflare Workers + Durable Objects
- **e2e-tests**: Playwright tests for both applications

## Common Development Commands

```bash
# Install dependencies (from root or any package)
pnpm install

# Run both apps in development (from root)
pnpm dev

# Run specific app
pnpm --filter chat-ui dev                          # http://localhost:5173
pnpm --filter remote-mcp-with-ui-starter dev       # http://localhost:8888

# Build everything
pnpm build

# Build specific packages
pnpm --filter chat-ui build
pnpm --filter remote-mcp-with-ui-starter build

# Run all E2E tests
pnpm test

# Run specific test suites
pnpm test:integration     # Integration tests (both apps together)
pnpm test:chat-ui        # Chat UI tests only
pnpm test:remote-mcp     # Remote MCP tests only
pnpm test:ui             # Playwright UI mode (best for debugging)
pnpm test:debug          # Playwright Inspector (step through tests)

# Linting
pnpm lint                # All packages
pnpm --filter chat-ui lint

# Deploy to Cloudflare
pnpm --filter chat-ui deploy
pnpm --filter remote-mcp-starter deploy
```

## Development Workflow

**To test the full integration**, run both apps together:

**Terminal 1 - MCP Server:**
```bash
cd remote-mcp-with-ui-starter
pnpm dev
# → http://localhost:8888
# → MCP endpoint: http://localhost:8888/mcp
```

**Terminal 2 - Chat UI:**
```bash
cd chat-ui
pnpm dev
# → http://localhost:5173
# → Automatically connects to localhost:8888/mcp
```

The chat UI will automatically discover tools from the MCP server and display UI resources in its side panel.

## Architecture Patterns

### MCP UI Resources (Server → UI)

The MCP server can return three types of UI resources:

1. **externalUrl**: Embeds iframe with a URL (used for mini-apps)
2. **rawHtml**: Renders sanitized HTML directly
3. **remoteDom**: Executes JavaScript to build DOM elements

Example from [remote-mcp-with-ui-starter/worker/mcpServer.ts](remote-mcp-with-ui-starter/worker/mcpServer.ts):
```typescript
this.server.tool("showTicTacToeGame", "Display TicTacToe game", {}, async () => {
  const iframeUrl = `${this.getBaseUrl()}/mini-apps/tictactoe/`;

  return {
    content: [createUIResource({
      uri: "ui://tictactoe",
      content: { type: "externalUrl", iframeUrl },
      encoding: "blob"
    })]
  };
});
```

### WebMCP Dynamic Tool Registration (UI → Server)

Mini-apps can register tools back to the AI using the `useWebMCP` hook:

```typescript
import { useWebMCP } from '@mcp-b/react-webmcp';

useWebMCP({
  name: "tictactoe_ai_move",
  description: "Make AI move in TicTacToe",
  schema: z.object({ position: z.number().int().min(0).max(8) }),
  handler: async (params) => {
    // Tool implementation
    return { content: [{ type: "text", text: "Move successful" }] };
  }
});
```

**Communication Flow:**
1. AI calls `showTicTacToeGame` → MCP server returns UI resource
2. Chat UI displays iframe with TicTacToe app
3. TicTacToe app initializes WebMCP transport (TabServer)
4. TicTacToe app registers tools via `useWebMCP`
5. AI receives tool registrations via postMessage
6. AI can now call `tictactoe_ai_move` etc.
7. Tool calls are routed to iframe, results returned to AI

### Mini-App Structure

Mini-apps are self-contained apps served as static assets from the worker:

```
remote-mcp-with-ui-starter/
├── mini-apps/tictactoe/           # Source files
│   ├── index.html
│   └── main.tsx
├── dist/client/mini-apps/tictactoe/  # Build output (gitignored)
│   ├── index.html
│   └── assets/...
└── worker/index.ts                # Serves static files
```

**Key requirements for mini-apps:**
- Must call `initializeWebModelContext()` before React renders
- Must set `postMessageTarget: window.parent` to communicate with parent window
- Must use `useWebMCP` hook to register tools
- Build output is served as static assets from the worker

See [remote-mcp-with-ui-starter/mini-apps/tictactoe/main.tsx](remote-mcp-with-ui-starter/mini-apps/tictactoe/main.tsx) for complete example.

## Technology Stack

### Core Technologies
- **React 19.1.1** with React Compiler (experimental)
- **TypeScript 5.8.3** with project references
- **Vite 7.1.12** for building (multi-entry builds)
- **pnpm 9.15.4** for package management
- **Turborepo 2.5.6** for monorepo orchestration

### MCP & AI
- **@modelcontextprotocol/sdk 1.20.2** - Core MCP protocol
- **@mcp-ui packages** - MCP UI resource support
- **@mcp-b packages** - WebMCP integration (react-webmcp, transports, global)
- **agents 0.2.20** - McpAgent base class from Cloudflare
- **Vercel AI SDK 5.0.87** with Anthropic provider (chat-ui)

### Deployment & Backend
- **Cloudflare Workers** - Serverless deployment
- **Cloudflare Durable Objects** - Stateful MCP server instances
- **Hono 4.10.4** - API routing
- **Wrangler 4.45.3** - Cloudflare CLI

### UI & Styling
- **Tailwind CSS 4.1.10** with Motion animations
- **Radix UI** - Accessible component primitives
- **@assistant-ui/react 0.11.37** - Chat UI components
- **React JSON Schema Form** - Dynamic form generation

### Testing & Observability
- **Playwright 1.49.2** - E2E testing
- **Sentry** - Error tracking and AI monitoring (chat-ui worker)

## Environment Configuration

Both apps use environment-specific `.env` files **committed to git** (they contain public URLs, not secrets):

**chat-ui:**
- `.env.development` - `VITE_MCP_SERVER_URL=http://localhost:8888/mcp`
- `.env.production` - Production MCP server URL

**remote-mcp-with-ui-starter:**
- `.dev.vars` - `APP_URL=http://localhost:8888`
- `.prod.vars` - Production worker URL

**For local overrides** (gitignored):
- `.env.development.local` / `.env.production.local` (chat-ui)
- `.dev.vars.local` / `.prod.vars.local` (remote-mcp-with-ui-starter)

**API Keys:**
- Anthropic API key stored in browser localStorage (chat-ui Settings UI)
- `VITE_ANTHROPIC_API_KEY` serves as fallback (optional, use `.local` files for dev)
- Never commit API keys to `.env.development` or `.env.production`

## TypeScript Configuration

Multiple `tsconfig` files per package using project references:
- `tsconfig.json` - Project references (parent config)
- `tsconfig.app.json` - React app code
- `tsconfig.worker.json` - Cloudflare Worker code (remote-mcp-with-ui-starter)
- `tsconfig.node.json` - Build tooling (Vite config, etc.)

To check all TypeScript projects:
```bash
pnpm exec tsc -b
```

## Testing

### Running E2E Tests

Tests require both apps to be built first:

```bash
# Build all packages
pnpm build

# Run all tests
pnpm test

# Best for development (interactive UI)
pnpm test:ui

# Debug mode (step through tests)
pnpm test:debug

# Run with visible browser
pnpm test:headed
```

### Test Structure

- **chat-ui.spec.ts** - Chat UI tests (loads, renders, no errors)
- **remote-mcp-starter.spec.ts** - MCP server tests (loads, React mounts)
- **integration.spec.ts** - Both apps together (full workflow)

Tests verify:
- Applications load correctly
- React apps mount without errors
- No console errors
- Network requests succeed
- Both apps work together in integration tests

## Common Patterns & Best Practices

### Adding a New MCP Tool

Edit [remote-mcp-with-ui-starter/worker/mcpServer.ts](remote-mcp-with-ui-starter/worker/mcpServer.ts):

```typescript
async init() {
  this.server.tool(
    "myToolName",
    "Tool description",
    { param: { type: "string" } },  // Optional schema
    async (params) => {
      // Implementation
      return {
        content: [{ type: "text", text: "Result" }]
      };
    }
  );
}
```

### Creating a New Mini-App

1. Create directory: `mkdir -p mini-apps/my-app`
2. Add `index.html` and `main.tsx` entry point
3. Initialize WebMCP in `main.tsx` before rendering:
   ```typescript
   import { initializeWebModelContext } from '@mcp-b/global';

   initializeWebModelContext({
     transport: {
       tabServer: {
         allowedOrigins: ['*'],
         postMessageTarget: window.parent,
       },
     },
   });
   ```
4. Update [remote-mcp-with-ui-starter/vite.config.ts](remote-mcp-with-ui-starter/vite.config.ts) with new entry point
5. Add MCP tool to display it in [remote-mcp-with-ui-starter/worker/mcpServer.ts](remote-mcp-with-ui-starter/worker/mcpServer.ts)

### URL Construction

The MCP server uses `env.APP_URL` to construct iframe URLs:
- Development: `http://localhost:8888` (auto-detected or from `.dev.vars`)
- Production: `https://your-worker.workers.dev` (from `.prod.vars`)

Always use `this.getBaseUrl()` in mcpServer.ts to construct URLs - it handles environment detection.

## CI/CD Workflows

Two GitHub Actions workflows:

1. **ci.yml** (Lint, Typecheck, Build)
   - Runs on PRs and pushes to main
   - Uses Node version from `.nvmrc` (24.3.0)
   - Memory limit: 16GB for TypeScript compilation

2. **e2e.yml** (E2E Tests)
   - Runs on PRs and pushes to main
   - Builds packages, installs Playwright browsers (Chromium)
   - Uploads test results (7 days) and reports (30 days)
   - 10 minute timeout

## Troubleshooting

**TypeScript errors:**
```bash
pnpm exec tsc -b  # Check all TypeScript projects
```

**Build failures:**
```bash
rm -rf dist/ node_modules/.vite/
pnpm install
pnpm build
```

**Mini-apps not loading:**
- Check build output: `ls -la remote-mcp-with-ui-starter/dist/client/mini-apps/`
- Verify vite.config.ts has correct input paths
- Check browser console for CORS errors

**WebMCP tools not registering:**
- Verify `initializeWebModelContext()` is called before React renders
- Check `postMessageTarget: window.parent` is set
- Inspect browser console for WebMCP errors
- Ensure parent window is ready (handle `parent-ready` message)

**Port conflicts:**
```bash
lsof -ti:5173 | xargs kill  # Kill process on port 5173
lsof -ti:8888 | xargs kill  # Kill process on port 8888
```

## Additional Resources

- Node version: 24.3.0 (specified in `.nvmrc`)
- See [remote-mcp-with-ui-starter/ARCHITECTURE.md](remote-mcp-with-ui-starter/ARCHITECTURE.md) for detailed architecture documentation

## Key Files to Understand

- [remote-mcp-with-ui-starter/worker/mcpServer.ts](remote-mcp-with-ui-starter/worker/mcpServer.ts) - MCP server implementation, tool definitions
- [remote-mcp-with-ui-starter/worker/index.ts](remote-mcp-with-ui-starter/worker/index.ts) - Worker entry point, routing
- [remote-mcp-with-ui-starter/mini-apps/tictactoe/main.tsx](remote-mcp-with-ui-starter/mini-apps/tictactoe/main.tsx) - Complete mini-app example
- [chat-ui/src/main.tsx](chat-ui/src/main.tsx) - Chat UI entry point
- [turbo.json](turbo.json) - Turborepo task configuration
- [pnpm-workspace.yaml](pnpm-workspace.yaml) - Workspace package definitions
