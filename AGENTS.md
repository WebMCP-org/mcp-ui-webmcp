## FOR AGENTS
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Development standards and best practices for AI agents

## Quick Navigation

### Project Overview
- **[README.md](./README.md)** - What this monorepo does, quick start, and architecture overview
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Development standards and best practices for AI agents

### Package Documentation
- **[apps/chat-ui/README.md](./apps/chat-ui/README.md)** - React chat interface with MCP integration
- **[apps/mcp-server/README.md](./apps/mcp-server/README.md)** - MCP server with embedded UIs
- **[apps/create-webmcp-app/README.md](./apps/create-webmcp-app/README.md)** - Interactive CLI for scaffolding new projects
- **[templates/react/README.md](./templates/react/README.md)** - React + TypeScript template
- **[templates/vanilla/README.md](./templates/vanilla/README.md)** - Vanilla HTML/JS template
- **[tests/e2e/README.md](./tests/e2e/README.md)** - Playwright E2E testing

### Architecture & Design
- **[apps/mcp-server/ARCHITECTURE.md](./apps/mcp-server/ARCHITECTURE.md)** - Detailed architecture decisions and patterns
- **[apps/mcp-server/EMBEDDING_PROTOCOL.md](./apps/mcp-server/EMBEDDING_PROTOCOL.md)** - WebMCP embedding protocol details
- **[apps/mcp-server/ROUTES.md](./apps/mcp-server/ROUTES.md)** - Worker routing and endpoints
- **[apps/mcp-server/README.md#-how-to-customize](./apps/mcp-server/README.md#-how-to-customize)** - Guide for creating new mini-apps

### Configuration & Environment
- **[docs/ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md)** - Environment variables and deployment configuration
- **[docs/TESTING.md](./docs/TESTING.md)** - Testing infrastructure and best practices

## Common Development Tasks

### Running the Project
```bash
# Install dependencies
pnpm install

# Run both apps (recommended for full integration)
pnpm dev

# Run individual apps
cd apps/chat-ui && pnpm dev        # http://localhost:5173
cd apps/mcp-server && pnpm dev     # http://localhost:8888

# Run templates manually
cd templates/react && pnpm dev     # http://localhost:8888
cd templates/vanilla && pnpm dev   # http://localhost:8889
```

### Code Quality
```bash
pnpm check      # Run lint and typecheck
pnpm lint       # Lint all packages
pnpm typecheck  # Type-check all packages
pnpm build      # Build all packages
```

### Testing
```bash
pnpm test           # Run all E2E tests
pnpm test:ui        # Interactive Playwright UI
pnpm test:debug     # Debug mode
```

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for detailed development standards.

## Key Technologies

- **TypeScript 5.8.3** - Type-safe development with project references
- **React 19.1.1** - UI framework with React Compiler
- **Vite 7.1.12** - Build tool and dev server
- **Turborepo 2.5.6** - Monorepo task orchestration
- **pnpm 10.14.0** - Package management
- **Playwright 1.49.2** - E2E testing

## Critical Patterns

### MCP UI Resources
The server returns three types of UI resources:
- `externalUrl` - Iframe with URL (mini-apps)
- `rawHtml` - Sanitized HTML
- `remoteDom` - Dynamic JavaScript DOM

See: [apps/mcp-server/README.md](./apps/mcp-server/README.md#key-components)

### WebMCP Tool Registration
Mini-apps register tools dynamically using `useWebMCP` hook:
```typescript
useWebMCP({
  name: "tool_name",
  description: "What it does",
  schema: z.object({ /* ... */ }),
  handler: async (params) => { /* ... */ }
});
```

See: [apps/mcp-server/EMBEDDING_PROTOCOL.md](./apps/mcp-server/EMBEDDING_PROTOCOL.md)

### TypeScript Project References
Each package uses multiple tsconfig files:
- `tsconfig.json` - Project references (parent)
- `tsconfig.app.json` - React app code
- `tsconfig.worker.json` - Cloudflare Worker code (remote-mcp only)
- `tsconfig.node.json` - Build tooling (Vite config)

Verify with: `pnpm exec tsc -b`

## File Locations

### Adding MCP Tools
Edit: [apps/mcp-server/worker/mcpServer.ts](./apps/mcp-server/worker/mcpServer.ts)

### Creating Embedded Apps
1. Add your app to: `apps/mcp-server/src/`
2. Add entry point: `main.tsx` and `index.html`
3. Update: [apps/mcp-server/vite.config.ts](./apps/mcp-server/vite.config.ts)
4. Add MCP tool to display it

See: [apps/mcp-server/README.md#-how-to-customize](./apps/mcp-server/README.md#-how-to-customize)

### Modifying Routes
Edit: [apps/mcp-server/worker/index.ts](./apps/mcp-server/worker/index.ts)

See: [apps/mcp-server/ROUTES.md](./apps/mcp-server/ROUTES.md)

## Troubleshooting

For common issues (port conflicts, build failures, WebMCP setup), see:
- [README.md](./README.md#troubleshooting)
- [apps/mcp-server/README.md](./apps/mcp-server/README.md#troubleshooting)

## Development Standards

Before making changes, review **[CONTRIBUTING.md](./CONTRIBUTING.md)** for:
- Type safety requirements
- Single source of truth principles
- Modularity patterns
- Code cleanliness standards
- Documentation requirements

---

**Remember**: This file is a navigation hub only. All detailed information lives in the linked documentation to maintain a single source of truth.
