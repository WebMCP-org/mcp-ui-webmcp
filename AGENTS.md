# AI Agent Development Guide

Welcome! This file serves as the entry point for AI assistants working on this codebase. All detailed information is maintained in dedicated documentation files to ensure a single source of truth.

## Quick Navigation

### Project Overview
- **[README.md](./README.md)** - What this monorepo does, quick start, and architecture overview
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Development standards and best practices for AI agents

### Package Documentation
- **[chat-ui/README.md](./chat-ui/README.md)** - React chat interface with MCP integration
- **[remote-mcp-with-ui-starter/README.md](./remote-mcp-with-ui-starter/README.md)** - MCP server with embedded UIs
- **[e2e-tests/README.md](./e2e-tests/README.md)** - Playwright E2E testing

### Architecture & Design
- **[remote-mcp-with-ui-starter/ARCHITECTURE.md](./remote-mcp-with-ui-starter/ARCHITECTURE.md)** - Detailed architecture decisions and patterns
- **[remote-mcp-with-ui-starter/EMBEDDING_PROTOCOL.md](./remote-mcp-with-ui-starter/EMBEDDING_PROTOCOL.md)** - WebMCP embedding protocol details
- **[remote-mcp-with-ui-starter/ROUTES.md](./remote-mcp-with-ui-starter/ROUTES.md)** - Worker routing and endpoints
- **[remote-mcp-with-ui-starter/ADDING_NEW_APPS.md](./remote-mcp-with-ui-starter/ADDING_NEW_APPS.md)** - Guide for creating new mini-apps

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
cd chat-ui && pnpm dev              # http://localhost:5173
cd remote-mcp-with-ui-starter && pnpm dev  # http://localhost:8888
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
- **pnpm 9.15.4** - Package management
- **Playwright 1.49.2** - E2E testing

## Critical Patterns

### MCP UI Resources
The server returns three types of UI resources:
- `externalUrl` - Iframe with URL (mini-apps)
- `rawHtml` - Sanitized HTML
- `remoteDom` - Dynamic JavaScript DOM

See: [remote-mcp-with-ui-starter/README.md](./remote-mcp-with-ui-starter/README.md#key-components)

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

See: [remote-mcp-with-ui-starter/EMBEDDING_PROTOCOL.md](./remote-mcp-with-ui-starter/EMBEDDING_PROTOCOL.md)

### TypeScript Project References
Each package uses multiple tsconfig files:
- `tsconfig.json` - Project references (parent)
- `tsconfig.app.json` - React app code
- `tsconfig.worker.json` - Cloudflare Worker code (remote-mcp only)
- `tsconfig.node.json` - Build tooling (Vite config)

Verify with: `pnpm exec tsc -b`

## File Locations

### Adding MCP Tools
Edit: [remote-mcp-with-ui-starter/worker/mcpServer.ts](./remote-mcp-with-ui-starter/worker/mcpServer.ts)

### Creating Mini-Apps
1. Create directory: `remote-mcp-with-ui-starter/mini-apps/your-app/`
2. Add entry point: `main.tsx` and `index.html`
3. Update: [remote-mcp-with-ui-starter/vite.config.ts](./remote-mcp-with-ui-starter/vite.config.ts)
4. Add MCP tool to display it

See: [remote-mcp-with-ui-starter/ADDING_NEW_APPS.md](./remote-mcp-with-ui-starter/ADDING_NEW_APPS.md)

### Modifying Routes
Edit: [remote-mcp-with-ui-starter/worker/index.ts](./remote-mcp-with-ui-starter/worker/index.ts)

See: [remote-mcp-with-ui-starter/ROUTES.md](./remote-mcp-with-ui-starter/ROUTES.md)

## Troubleshooting

For common issues (port conflicts, build failures, WebMCP setup), see:
- [README.md](./README.md#troubleshooting)
- [remote-mcp-with-ui-starter/README.md](./remote-mcp-with-ui-starter/README.md#troubleshooting)

## Development Standards

Before making changes, review **[CONTRIBUTING.md](./CONTRIBUTING.md)** for:
- Type safety requirements
- Single source of truth principles
- Modularity patterns
- Code cleanliness standards
- Documentation requirements

---

**Remember**: This file is a navigation hub only. All detailed information lives in the linked documentation to maintain a single source of truth.
