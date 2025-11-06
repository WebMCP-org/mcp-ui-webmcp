# WebMCP Template

A **minimal, production-ready template** for building MCP (Model Context Protocol) servers with embedded web UIs using WebMCP.

Perfect for creating interactive games, tools, and applications that AI assistants can display and interact with!

## 🎯 What Is This?

This template provides the **essential boilerplate** to build MCP servers with embedded UIs, without the complexity of a full-featured application.

It demonstrates:
- **MCP UI**: Serving interactive web apps within AI assistants
- **WebMCP**: Embedded apps dynamically registering tools back to the server
- **Cloudflare Workers**: Zero-config deployment

## 🚀 Quick Start

### Prerequisites

- **Node.js 22.12+**
- **pnpm** (or npm/yarn)
- **Cloudflare account** (for deployment)

### Installation

```bash
# Clone and navigate to this directory
cd webmcp-template

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
- **Template app**: http://localhost:8888/

### Building

```bash
# Build for production
pnpm build
```

Outputs:
- `dist/client/` - Built web app
- `dist/webmcp_template/` - Cloudflare Worker bundle

### Deployment

```bash
# Deploy to Cloudflare Workers
pnpm deploy
```

**⚠️ Important**: Update `APP_URL` in `.prod.vars` to your actual Cloudflare Workers URL before deploying!

## 📦 What's Included

### Example MCP Tools

1. **showTemplateApp** - Display the template web app in an iframe
2. **sayHello** - Simple server-side tool (no WebMCP needed)

### Example WebMCP Tools (Registered by the App)

The template app registers three WebMCP tools:
1. **template_get_message** - Get current message
2. **template_update_message** - Update the message
3. **template_reset** - Reset to default

### Example Prompt

- **LaunchTemplate** - Pre-configured prompt to launch your app

## 🏗️ Project Structure

```
webmcp-template/
├── src/                      # React app source
│   ├── App.tsx               # Main app component
│   ├── main.tsx              # App entry point
│   ├── index.css             # Styles with Tailwind
│   └── vite-env.d.ts         # Type definitions
│
├── worker/                   # Cloudflare Worker code
│   ├── index.ts              # Worker entry & routing
│   └── mcpServer.ts          # MCP server implementation
│
├── .dev.vars                 # Development env variables
├── .prod.vars                # Production env variables
├── deploy.sh                 # Deployment script
├── index.html                # HTML entry point
├── vite.config.ts            # Vite configuration
├── wrangler.jsonc            # Cloudflare Workers config
├── package.json              # Dependencies & scripts
└── README.md                 # This file
```

## 🎮 Build Your Own App

Ready to build your own game or tool? See **[QUICKSTART.md](./QUICKSTART.md)** for step-by-step instructions!

### Quick Examples

**Want to build a game?** See the [Game Builder Prompt](#) that helps you scaffold common games like:
- Chess
- Connect Four
- Wordle
- Hangman
- And more!

**Want to customize?** Replace the template app in `src/App.tsx` with your own React component!

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Step-by-step guide to building your app
- **[TESTING.md](./TESTING.md)** - How to test your embedded app
- **[../CONTRIBUTING.md](../CONTRIBUTING.md)** - Development standards

## 🛠️ How To Customize

### Adding MCP Tools

Edit `worker/mcpServer.ts`:

```typescript
this.server.tool(
  'myTool',
  'Description of what this tool does',
  {},
  async () => {
    return {
      content: [{
        type: 'text',
        text: 'Tool executed!'
      }]
    };
  }
);
```

### Adding WebMCP Tools in Your App

In `src/App.tsx`:

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

## 🔍 How It Works

### MCP UI Resources

MCP UI extends the Model Context Protocol to allow servers to return interactive UIs. This template uses:

- **externalUrl**: Embeds an iframe with your app's URL

### WebMCP Dynamic Tool Registration

Your React app registers tools dynamically:

```typescript
useWebMCP({
  name: "template_get_message",
  description: "Get the current message",
  handler: async () => {
    return `Current message: ${message}`;
  }
});
```

### Communication Flow

1. AI calls `showTemplateApp` → MCP server returns UI resource with iframe URL
2. AI assistant displays iframe with your app
3. Your app initializes WebMCP transport
4. Your app registers tools via `useWebMCP`
5. AI receives tool registrations via postMessage
6. AI calls your tools → routed to iframe via postMessage
7. Tool executes in iframe → result returned to AI

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
- [React 19](https://react.dev/) - UI framework

## 🤝 Contributing

This template is part of the [mcp-ui-webmcp](https://github.com/WebMCP-org/mcp-ui-webmcp) repository.

## 📄 License

MIT - See the repository root for license information.

---

**Ready to build your own MCP UI + WebMCP application?** Start customizing! 🚀

Check out **[QUICKSTART.md](./QUICKSTART.md)** for step-by-step instructions!
