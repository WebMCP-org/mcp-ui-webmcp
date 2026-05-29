# WebMCP Template - Vanilla (No Build Step!)

A **minimal, production-ready template** for building MCP servers with embedded web UIs using **pure HTML, CSS, and JavaScript** - **NO build step required!**

Perfect for learning WebMCP, rapid prototyping, or building simple interactive tools!

## 🎯 What Is This?

This template provides the **simplest possible** way to build MCP servers with embedded UIs:
- **✅ No npm dependencies for the frontend**
- **✅ No build step**
- **✅ No transpiling**
- **✅ Just open the HTML file and start coding!**

It demonstrates:
- **MCP UI**: Serving interactive web apps within AI assistants
- **WebMCP**: Embedded apps dynamically registering tools using the W3C `navigator.modelContext` API
- **Vanilla JS**: Pure JavaScript with Tailwind CSS via CDN
- **IIFE Build**: @mcp-b/global loaded via `<script>` tag

## 🚀 Quick Start

### Prerequisites

- **Node.js 22.12+** (only for the MCP server, not the frontend!)
- **pnpm** (or npm/yarn)
- **Cloudflare account** (for deployment)

### Installation

```bash
# Clone and navigate to this directory
cd templates/vanilla

# Install dependencies (worker only)
pnpm install
```

### Development

```bash
# Start local development server
pnpm dev
```

This starts:
- **MCP endpoint**: http://localhost:8889/mcp
- **SSE endpoint**: http://localhost:8889/sse
- **Template app**: http://localhost:8889/

**Or just open `public/index.html` directly in your browser!** (WebMCP tools won't work standalone, but you can test the UI)

### Testing WebMCP Tools

You can test the WebMCP tools registered by your app using the [MCP-B Chrome Extension](https://chromewebstore.google.com/detail/mcp-b/fkhbffeojcfadbkpldmbjlbfocgknjlj):

1. Start the development server: `pnpm dev`
2. Visit http://localhost:8889/ in Chrome
3. Open the MCP-B Chrome Extension
4. You'll see your registered WebMCP tools (`template_get_message`, `template_update_message`, `template_reset`)
5. Test calling the tools directly from the extension

This is perfect for debugging and testing your tools without needing a full chat UI!

### Deployment

```bash
# Deploy to Cloudflare Workers
pnpm deploy
```

**⚠️ Important**: Update `APP_URL` in `.prod.vars` to your actual Cloudflare Workers URL before deploying!

## 📦 What's Included

### Example MCP Tools

1. **showTemplateApp** - Display the template web app in an iframe
2. **sayHello** - Simple server-side tool

### Example WebMCP Tools (Registered by the App)

The vanilla app registers three WebMCP tools using `window.navigator.modelContext.provideContext()`:
1. **template_get_message** - Get current message
2. **template_update_message** - Update the message
3. **template_reset** - Reset to default

### Example Prompts

- **LaunchTemplate** - Pre-configured prompt to launch your app
- **BuildGame** - Helps you scaffold a new game in vanilla JS!

## 🏗️ Project Structure

```
templates/vanilla/
├── public/
│   └── index.html            # Everything in one file!
│
├── worker/                   # Cloudflare Worker code (TypeScript)
│   ├── index.ts              # Worker entry & routing
│   └── mcpServer.ts          # MCP server implementation
│
├── .dev.vars                 # Development env variables
├── .prod.vars                # Production env variables
├── deploy.sh                 # Deployment script
├── wrangler.jsonc            # Cloudflare Workers config
├── package.json              # Dependencies (worker only)
└── README.md                 # This file
```

## 🎨 How It Works

### The Vanilla Approach

Unlike the React template, this version has **NO build step** for the frontend:

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Tailwind CSS via CDN -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- @mcp-b/global IIFE build via CDN -->
  <script src="https://unpkg.com/@mcp-b/global@3.0.0/dist/index.iife.js"></script>
</head>
<body>
  <!-- Your app here -->

  <script>
    // window.navigator.modelContext is already available!
    window.navigator.modelContext.provideContext({
      tools: [
        {
          name: 'my_tool',
          description: 'What this tool does',
          inputSchema: {
            type: 'object',
            properties: {
              param: { type: 'string' }
            }
          },
          async execute({ param }) {
            return {
              content: [{
                type: 'text',
                text: `Processed: ${param}`
              }]
            };
          }
        }
      ]
    });
  </script>
</body>
</html>
```

**That's it!** No `npm install`, no bundler, no transpiler.

## 🛠️ Customization

### Adding WebMCP Tools

Edit `public/index.html` and add tools to the `provideContext()` call:

```javascript
window.navigator.modelContext.provideContext({
  tools: [
    // Your existing tools...
    {
      name: 'my_new_tool',
      description: 'Description here',
      inputSchema: {
        type: 'object',
        properties: {
          // Define parameters
        }
      },
      async execute(params) {
        // Your logic here
        return {
          content: [{
            type: 'text',
            text: 'Result...'
          }]
        };
      }
    }
  ]
});
```

### Styling with Tailwind

Use Tailwind utility classes directly in your HTML:

```html
<button class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
  Click Me
</button>
```

### Adding MCP Server Tools

Edit `worker/mcpServer.ts` to add server-side tools.

## 📚 Documentation

- **Main README** ([README.md](../../README.md)) - Architecture overview
- **React Template** ([../react/README.md](../react/README.md)) - For apps needing a build step
- **CONTRIBUTING** ([../../CONTRIBUTING.md](../../CONTRIBUTING.md)) - Development standards

## 🎮 Build a Game

Want to build a game? Use the `BuildGame` prompt!

The AI will ask you what game you want to build and scaffold the complete implementation in `public/index.html`.

Example games you can build:
- **Tic-Tac-Toe** (see [apps/mcp-server](../../apps/mcp-server) for React version)
- **Connect Four**
- **Wordle Clone**
- **Hangman**
- **Memory Game**
- **Rock Paper Scissors**
- **And more!**

## 🔍 Vanilla vs React Template

| Feature | Vanilla Template | React Template |
|---------|-----------------|----------------|
| **Build Step** | ❌ None | ✅ Vite |
| **Dependencies** | ❌ CDN only | ✅ npm packages |
| **Hot Reload** | ❌ Manual refresh | ✅ HMR |
| **TypeScript** | ❌ Vanilla JS | ✅ Full TS |
| **Component System** | ❌ Plain HTML | ✅ React |
| **Best For** | Learning, prototypes | Production apps |
| **Complexity** | ⭐ Simple | ⭐⭐ Moderate |

**When to use Vanilla:**
- Learning WebMCP for the first time
- Quick prototypes or demos
- Simple interactive tools
- You prefer vanilla JavaScript
- You want instant feedback (no build time)

**When to use React:**
- Complex applications
- Need component reusability
- Want TypeScript
- Building production apps
- Prefer modern tooling

## 🐛 Troubleshooting

### App Not Loading

1. Check that `pnpm dev` is running
2. Verify `.dev.vars` has `APP_URL=http://localhost:8889`
3. Open browser console for errors

### Tools Not Registering

1. Check that the IIFE script loaded: `<script src="https://unpkg.com/@mcp-b/global@3.0.0/dist/index.iife.js"></script>`
2. Verify `window.navigator.modelContext` exists in console
3. Check that `provideContext()` is called after the script loads

### CDN Not Loading

If unpkg.com is blocked, download the files locally:

```bash
# Download @mcp-b/global IIFE build
curl -o public/webmcp.js https://unpkg.com/@mcp-b/global@3.0.0/dist/index.iife.js

# Update your HTML
<script src="./webmcp.js"></script>
```

## 📖 Learn More

### WebMCP Resources
- [WebMCP Specification](https://github.com/webmachinelearning/webmcp)
- [MCP-B Documentation](https://docs.mcp-b.ai)
- [@mcp-b/global npm package](https://www.npmjs.com/package/@mcp-b/global)

### MCP Resources
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)

### Cloudflare Resources
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

## 🤝 Contributing

This template is part of the [mcp-ui-webmcp](https://github.com/WebMCP-org/mcp-ui-webmcp) repository.

## 📄 License

MIT - See the repository root for license information.

---

**Ready to build with vanilla JS?** Just open `public/index.html` and start coding! 🚀

No `npm install`, no build step, no waiting. Just pure JavaScript and WebMCP!
