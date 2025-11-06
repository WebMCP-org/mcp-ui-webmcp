# MCP UI + WebMCP Starter Template

A production-ready starter for building **MCP (Model Context Protocol) servers with embedded web UIs** that can dynamically register tools back to the server using **WebMCP**.

This starter demonstrates:
- **MCP UI**: Serving an interactive web application as a UI resource within AI assistants
- **WebMCP**: The embedded app dynamically registering tools that AI can use
- **Cloudflare Workers**: Zero-config deployment with Durable Objects

## 🎯 What Makes This Special?

This is a **dual-direction integration**:

1. **MCP Server → UI**: The AI assistant invokes a tool that displays an interactive web app
2. **UI → MCP Server**: The embedded web app registers its own tools for the AI to use

### Example: Tic-Tac-Toe Game

When the AI calls `showTicTacToeGame`:
- The game UI appears in the AI assistant's side panel
- The game automatically registers 3 new tools: `tictactoe_get_state`, `tictactoe_ai_move`, `tictactoe_reset`
- The AI can now play the game by calling these dynamically registered tools
- All communication happens seamlessly through iframe postMessage

## 🚀 Quick Start

### Prerequisites

- **Node.js 24.3.0+** (keeps parity with repo `.nvmrc`)
- **pnpm** (or npm/yarn)
- **Cloudflare account** (for deployment)

### Installation

```bash
# Clone and navigate to this directory
cd apps/mcp-server

# Install dependencies
pnpm install
```

### Development

```bash
# Start local development server
pnpm dev
```

This starts:
- **MCP endpoint**: http://localhost:8888/mcp
- **SSE endpoint**: http://localhost:8888/sse
- **TicTacToe app**: http://localhost:8888/

### Building

```bash
# Build for production
pnpm build
```

Outputs:
- `dist/client/` - TicTacToe web app
- `dist/mcp_ui_with_webmcp_my_mcp_server/` - Cloudflare Worker bundle

### Deployment

```bash
# Deploy to Cloudflare Workers
pnpm deploy
```

The deploy script automatically:
1. Builds the project
2. Loads variables from `.prod.vars`
3. Deploys to Cloudflare Workers

Your MCP server will be live at: `https://your-worker.workers.dev/mcp`

**⚠️ Important**: Update `APP_URL` in `.prod.vars` to your actual Cloudflare Workers URL before deploying!

## 📦 What's Included

### 5 Example MCP Tools

1. **showExternalUrl** - Display any external website in an iframe
2. **showRawHtml** - Render raw HTML content directly
3. **showRemoteDom** - Execute JavaScript to build dynamic UIs
4. **showTicTacToeGame** - Interactive game with WebMCP integration ⭐
5. **tictactoe_get_stats** - Get global game statistics

### 1 Example Prompt

- **PlayTicTacToe** - Pre-configured prompt to start a game

### Complete WebMCP Example

The TicTacToe game demonstrates:
- React component architecture with TypeScript
- WebMCP tool registration with `useWebMCP` hook
- Parent-child iframe communication
- State management and game logic
- Real-time statistics with WebSocket and Durable Objects

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│          AI Assistant                    │
│  - Calls: showTicTacToeGame             │
│  - Receives: tictactoe_* tools          │
└────────────┬────────────────────────────┘
             │ HTTP/SSE
             ↓
┌─────────────────────────────────────────┐
│      Cloudflare Worker                   │
│  ┌──────────────────────────────────┐   │
│  │  MCP Server (Durable Object)     │   │
│  │  - showTicTacToeGame             │   │
│  │  - tictactoe_get_stats           │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  GameStatsStorage (DO)           │   │
│  │  - WebSocket connections         │   │
│  │  - Real-time stats updates       │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  Static App (dist/client/)       │   │
│  │  - TicTacToe React app           │   │
│  └──────────────────────────────────┘   │
└────────────┬────────────────────────────┘
             │ Serves iframe
             ↓
┌─────────────────────────────────────────┐
│      TicTacToe App (iframe)             │
│  ┌──────────────────────────────────┐   │
│  │  WebMCP Client                   │   │
│  │  - Registers: tictactoe_*        │   │
│  │  - Handles tool calls            │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## 🛠️ Project Structure

```
apps/mcp-server/
├── src/                              # React app source
│   ├── TicTacToe.tsx                 # Pure game component
│   ├── TicTacToeWithWebMCP.tsx       # WebMCP integration
│   ├── ErrorBoundary.tsx             # Error handling
│   ├── main.tsx                      # App entry point
│   └── index.css                     # Styles with Tailwind
│
├── worker/                           # Cloudflare Worker code
│   ├── index.ts                      # Worker entry & routing (Hono)
│   ├── mcpServer.ts                  # MCP server implementation
│   └── gameStatsStorage.ts           # Durable Object for stats
│
├── dist/                             # Build output (gitignored)
│   ├── client/                       # Built web app
│   └── mcp_ui_with_webmcp_my_mcp_server/  # Worker bundle
│
├── .dev.vars                         # Development env variables
├── .prod.vars                        # Production env variables
├── deploy.sh                         # Deployment script
├── vite.config.ts                    # Vite configuration
├── wrangler.jsonc                    # Cloudflare Workers config
├── package.json                      # Dependencies & scripts
└── README.md                         # This file
```

## 🧩 How To Customize

### Adding a New MCP Tool

Edit `worker/mcpServer.ts`:

```typescript
async init() {
  // ... existing tools ...

  this.server.tool(
    "myCustomTool",
    "Description of what this tool does",
    {},
    async () => {
      return {
        content: [{
          type: "text",
          text: "Tool executed successfully!"
        }]
      };
    }
  );
}
```

### Modifying the TicTacToe App

The app lives in `src/`. Key files:
- `TicTacToe.tsx` - Pure game component (no WebMCP)
- `TicTacToeWithWebMCP.tsx` - WebMCP wrapper that registers tools
- `main.tsx` - Entry point that initializes WebMCP

### Adding WebMCP Tools

In your React component:

```typescript
import { useWebMCP } from '@mcp-b/react-webmcp';
import { z } from 'zod';

useWebMCP({
  name: "my_tool",
  description: "What this tool does",
  inputSchema: {
    param: z.string().describe("Parameter description")
  },
  handler: async (params) => {
    // Your logic here
    return `Processed: ${params.param}`;
  }
});
```

### Environment Configuration

**`.dev.vars`** (Development):
```env
APP_URL=http://localhost:8888
```

**`.prod.vars`** (Production):
```env
APP_URL=https://your-worker.workers.dev
```

Change `APP_URL` in `.prod.vars` to your actual Cloudflare Workers URL.

## 🔍 How It Works

### MCP UI Resources

MCP UI extends the Model Context Protocol to allow servers to return interactive UIs. Three types:

1. **externalUrl**: Embeds an iframe with a URL (used for TicTacToe)
2. **rawHtml**: Renders sanitized HTML directly
3. **remoteDom**: Executes JavaScript to build DOM elements

### WebMCP Dynamic Tool Registration

The TicTacToe app registers tools dynamically:

```typescript
// In src/TicTacToeWithWebMCP.tsx
useWebMCP({
  name: "tictactoe_ai_move",
  description: "Make a move as the AI player",
  inputSchema: { position: z.number().min(0).max(8) },
  handler: async ({ position }) => {
    // Game logic executes in iframe
    // Result sent back to AI
    return formatMoveMarkdown(...);
  }
});
```

### Communication Flow

1. AI calls `showTicTacToeGame` → MCP server returns UI resource with iframe URL
2. AI assistant displays iframe with TicTacToe app
3. TicTacToe app initializes WebMCP transport (TabServer)
4. TicTacToe app registers tools via `useWebMCP`
5. AI receives tool registrations via postMessage
6. AI calls `tictactoe_ai_move` → routed to iframe via postMessage
7. Tool executes in iframe → result returned to AI

## 📚 Additional Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture and design decisions
- **[EMBEDDING_PROTOCOL.md](./EMBEDDING_PROTOCOL.md)** - WebMCP embedding protocol details
- **[ROUTES.md](./ROUTES.md)** - Worker routing and endpoints
- **Inline code comments** - Every file is thoroughly documented

## 🐛 Troubleshooting

### TypeScript Errors

```bash
pnpm typecheck
```

### Build Failures

```bash
# Clean and rebuild
rm -rf dist/ node_modules/.vite/
pnpm build
```

### App Not Loading in Dev

1. Check that `pnpm dev` is running
2. Verify `.dev.vars` has `APP_URL=http://localhost:8888`
3. Check browser console for errors

### Tools Not Registering (WebMCP)

1. Check that `initializeWebModelContext` is called in `main.tsx`
2. Verify `postMessageTarget` is not set (defaults to `window.parent`)
3. Check browser console for WebMCP errors
4. Ensure parent window is ready (app handles readiness protocol)

### Deployment Issues

```bash
# Check wrangler is authenticated
wrangler whoami

# Test locally with production build
pnpm build
wrangler dev --remote

# Check worker logs
wrangler tail
```

## 📖 Learn More

### MCP Resources
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP UI Extensions](https://github.com/mcp-ui)

### Cloudflare Resources
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### Libraries Used
- [agents](https://github.com/cloudflare/mcp-server-cloudflare/) - McpAgent base class
- [@mcp-b/react-webmcp](https://www.npmjs.com/package/@mcp-b/react-webmcp) - WebMCP React hooks
- [Hono](https://hono.dev/) - Fast web framework for Workers
- [Vite](https://vitejs.dev/) - Build tool
- [React 19](https://react.dev/) - UI framework with React Compiler

## 🤝 Contributing

This starter is part of the [mcp-ui-webmcp](https://github.com/WebMCP-org/mcp-ui-webmcp) repository.

## 📄 License

MIT - See the repository root for license information.

---

**Ready to build your own MCP UI + WebMCP application?** Start customizing this starter! 🚀
