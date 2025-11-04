<div align="center">

![MCP UI + WebMCP](./chat-ui/public/mcp-b-logo.png)

# MCP UI + WebMCP

**Bidirectional integration between AI assistants and embedded web applications**

[![CI](https://github.com/WebMCP-org/mcp-ui-webmcp/workflows/CI/badge.svg)](https://github.com/WebMCP-org/mcp-ui-webmcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-24.3.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org)

[Quick Start](#quick-start) • [Architecture](#architecture) • [Packages](#packages) • [Docs](#documentation)

</div>

---

## Demo

https://github.com/user-attachments/assets/your-demo-video.mp4

> **Note:** Replace with actual demo video showing: AI calling `showTicTacToeGame` → UI appears → Game registers tools → AI plays via tool calls

---

## What This Does

AI assistants invoke tools that render interactive web apps. Those apps can register new tools back to the AI. This combines [MCP UI resources](https://mcpui.dev/guide/introduction) with [WebMCP bidirectional tool registration](https://github.com/webmachinelearning/webmcp/blob/main/docs/explainer.md).

**Flow:**
1. AI calls `showTicTacToeGame`
2. MCP server returns UI resource with iframe
3. Game loads and registers `tictactoe_move`, `tictactoe_reset`, etc.
4. AI can now play the game using dynamically registered tools

This pattern works for any embedded application: forms, visualizations, interactive demos, configuration UIs.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run both apps (MCP server + Chat UI)
pnpm dev
```

Open http://localhost:5173 and ask the AI to show you a TicTacToe game.

### Requirements

- Node.js 24.3.0+ (see `.nvmrc`)
- pnpm 10.14.0+

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Chat UI (React)                                            │
│  ┌──────────────┐  ┌─────────────────────────────────────┐ │
│  │ AI Assistant │◄─┤ MCP Client + WebMCP Integration     │ │
│  └──────────────┘  └─────────────────────────────────────┘ │
│                     │                                       │
│                     ▼                                       │
│                    ┌──────────────────────────────────────┐│
│                    │ Iframe Container (Side Panel)        ││
│                    └──────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                             │
                             │ HTTP/SSE (MCP Protocol)
                             │
┌─────────────────────────────────────────────────────────────┐
│  MCP Server (Cloudflare Worker)                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Tool Registry (showTicTacToeGame, etc.)                 ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Static Asset Server (Serves mini-apps)                  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                             │
                             │ iframe src
                             ▼
                    ┌──────────────────┐
                    │ TicTacToe App    │
                    │ (React)          │
                    │                  │
                    │ useWebMCP()      │
                    │ - Registers tools│
                    │ - Handles calls  │
                    └──────────────────┘
```

### MCP UI Resources

Three resource types supported ([learn more](https://mcpui.dev/guide/protocol-details)):

| Type | Use Case | Implementation |
|------|----------|----------------|
| `externalUrl` | Embedded mini-apps | iframe with URL |
| `rawHtml` | Simple markup | Sanitized HTML |
| `remoteDom` | Dynamic content | JavaScript-generated DOM |

[→ MCP-UI Server SDK](https://mcpui.dev/guide/server/typescript/overview) | [→ MCP-UI Client SDK](https://mcpui.dev/guide/client/overview)

### WebMCP Tool Registration

Mini-apps register tools using the `useWebMCP` hook ([documentation](https://docs.mcp-b.ai/introduction)):

```typescript
import { useWebMCP } from '@mcp-b/react-webmcp';

useWebMCP({
  name: "tictactoe_move",
  description: "Make a move at position",
  schema: z.object({
    position: z.number().min(0).max(8)
  }),
  handler: async ({ position }) => {
    // Execute move
    return {
      content: [{
        type: "text",
        text: `Moved to position ${position}`
      }]
    };
  }
});
```

The AI can immediately invoke `tictactoe_move` as if it were a native MCP tool.

[→ MCP-B Quick Start](https://docs.mcp-b.ai/quickstart) | [→ MCP-B Examples](https://docs.mcp-b.ai/examples) | [→ NPM Packages](https://github.com/WebMCP-org/npm-packages)

## Packages

### chat-ui
React chat interface with MCP client and WebMCP integration. Connects to MCP servers via HTTP, displays UI resources, handles dynamic tool registration.

**Tech:** React 19, Vite, Tailwind CSS 4, Vercel AI SDK

[→ Documentation](./chat-ui/README.md)

### remote-mcp-with-ui-starter
MCP server implementation on Cloudflare Workers. Serves static mini-apps, implements MCP protocol with UI extensions.

**Tech:** Cloudflare Workers, Hono, @modelcontextprotocol/sdk

[→ Documentation](./remote-mcp-with-ui-starter/README.md)

### e2e-tests
Playwright test suite verifying integration between chat UI and MCP server.

[→ Documentation](./e2e-tests/README.md)

## Commands

```bash
# Development
pnpm dev                    # Run all apps
pnpm --filter chat-ui dev   # Chat UI only
pnpm --filter remote-mcp-with-ui-starter dev  # MCP server only

# Build & Quality
pnpm build                  # Build all packages
pnpm typecheck              # Type-check
pnpm lint                   # Lint all packages
pnpm check                  # Run lint + typecheck

# Testing
pnpm test                   # Run E2E tests
pnpm test:ui                # Interactive Playwright UI
pnpm test:debug             # Debug mode
```

## Deployment

### MCP Server → Cloudflare Workers

```bash
cd remote-mcp-with-ui-starter
pnpm build
pnpm deploy  # or: wrangler deploy
```

Configure `.prod.vars` with your worker URL.

### Chat UI → Cloudflare Pages

```bash
cd chat-ui
pnpm build
wrangler pages deploy dist
```

Configure `.env.production` with your MCP server URL.

See [ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md) for detailed configuration.

## Documentation

### Getting Started
- [AGENTS.md](./AGENTS.md) - Navigation hub for AI agents
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development standards

### Architecture
- [ARCHITECTURE.md](./remote-mcp-with-ui-starter/ARCHITECTURE.md) - Design decisions
- [EMBEDDING_PROTOCOL.md](./remote-mcp-with-ui-starter/EMBEDDING_PROTOCOL.md) - WebMCP protocol
- [ADDING_NEW_APPS.md](./remote-mcp-with-ui-starter/ADDING_NEW_APPS.md) - Create mini-apps

### Configuration
- [ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md) - Environment variables
- [TESTING.md](./docs/TESTING.md) - Test infrastructure

## Tech Stack

- **Monorepo:** Turborepo + pnpm workspaces
- **Frontend:** React 19, TypeScript 5.8, Vite 7
- **MCP:** @modelcontextprotocol/sdk, @mcp-ui packages
- **WebMCP:** @mcp-b packages for bidirectional tool registration
- **AI:** Vercel AI SDK with Anthropic provider
- **Runtime:** Cloudflare Workers + Durable Objects
- **Testing:** Playwright 1.49

## Contributing

Fork, experiment, report issues, submit improvements.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development standards.

## Resources

### MCP-UI (UI Resources)
- [MCP-UI Introduction](https://mcpui.dev/guide/introduction) - Overview of MCP UI resources
- [Protocol Details](https://mcpui.dev/guide/protocol-details) - Resource types and implementation
- [Server SDK (TypeScript)](https://mcpui.dev/guide/server/typescript/overview) - Build MCP servers with UI support
- [Client SDK](https://mcpui.dev/guide/client/overview) - Render UI resources in your client
- [GitHub](https://github.com/idosal/mcp-ui) - Source code and examples

### MCP-B (WebMCP / Bidirectional Tools)
- [MCP-B Documentation](https://docs.mcp-b.ai/introduction) - Getting started with WebMCP
- [Quick Start](https://docs.mcp-b.ai/quickstart) - Get WebMCP running in minutes
- [Core Concepts](https://docs.mcp-b.ai/concepts) - Architecture and system design
- [Examples](https://docs.mcp-b.ai/examples) - Ready-to-use implementations
- [NPM Packages](https://github.com/WebMCP-org/npm-packages) - `@mcp-b/react-webmcp` and more
- [WebMCP Explainer](https://github.com/webmachinelearning/webmcp/blob/main/docs/explainer.md) - W3C proposal and specification
- [Live Demo](https://mcp-b.ai) - Interactive examples

### Model Context Protocol
- [MCP Documentation](https://modelcontextprotocol.io/) - Official protocol documentation
- [MCP Specification](https://spec.modelcontextprotocol.io/) - Technical specification
- [MCP GitHub](https://github.com/modelcontextprotocol/modelcontextprotocol) - Specification repository

### Deployment & Infrastructure
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) - Serverless runtime
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/) - Stateful coordination
- [Playwright](https://playwright.dev/) - E2E testing framework

## License

MIT
