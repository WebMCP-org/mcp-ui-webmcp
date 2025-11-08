# create-webmcp-app

Interactive CLI for scaffolding new WebMCP applications.

## Usage

```bash
# Using npx (recommended)
npx @mcp-b/create-webmcp-app

# Using pnpm
pnpm dlx @mcp-b/create-webmcp-app

# Using npm
npx @mcp-b/create-webmcp-app

# Using bun
bunx @mcp-b/create-webmcp-app
```

## What It Does

The CLI will:
1. **Ask where to create your project**
2. **Let you choose a template:**
   - **Vanilla** - Pure HTML/CSS/JavaScript (no build step!)
   - **React** - React + TypeScript + Vite (full-featured)
3. **Copy template files** to your project directory
4. **Install dependencies** (optional)
5. **Show next steps**

## Templates

### Vanilla Template

Perfect for:
- 🎓 Learning WebMCP
- ⚡ Rapid prototyping
- 🎮 Simple games
- 📝 Quick demos

**Features:**
- NO build step required
- Pure HTML/CSS/JavaScript
- @mcp-b/global via CDN
- Tailwind CSS via CDN
- Just open `index.html` and start coding!

### React Template

Perfect for:
- 🏭 Production applications
- 🧩 Complex UIs
- 🔷 TypeScript-first development
- 🔥 Hot module replacement

**Features:**
- React 19 + TypeScript
- Vite for fast development
- Tailwind CSS 4
- @mcp-b/react-webmcp hooks
- Component architecture

## Example

```bash
$ npx @mcp-b/create-webmcp-app

┌  create-webmcp-app
│
◇  Where should we create your project?
│  ./my-game
│
◇  Which template would you like to use?
│  ● Vanilla (No Build Step)
│  ○ React (Full-Featured)
│
◇  Install dependencies?
│  Yes
│
◆  Project created successfully!
│
│  Next steps:
│    cd my-game
│    pnpm dev
│
│  Template info:
│    Pure HTML/CSS/JavaScript - perfect for learning
│
│  Happy coding! 🚀
└
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Test locally
node dist/index.js
```

## License

MIT
