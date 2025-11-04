# Route Map

All available routes in the MCP UI + WebMCP starter.

## 🌐 Application Routes

### TicTacToe Game
- **URL**: `/`
- **Description**: Interactive Tic-Tac-Toe game with WebMCP tool registration
- **Source**: `src/`
- **Type**: React SPA with WebMCP integration
- **Registered Tools**:
  - `tictactoe_get_state` - Get current board state
  - `tictactoe_ai_move` - Make a move as AI player
  - `tictactoe_reset` - Reset the game

---

## 🔌 API Routes

### MCP Protocol Endpoint
- **URL**: `/mcp`
- **Method**: POST
- **Description**: Model Context Protocol endpoint for AI assistant integration
- **Handler**: MyMCP Durable Object (`worker/mcpServer.ts`)
- **Features**:
  - Tool registration
  - Prompt definitions
  - UI resource creation

### Server-Sent Events
- **URL**: `/sse` and `/sse/*`
- **Methods**: GET, POST, OPTIONS
- **Description**: Real-time event streaming for MCP protocol
- **Handler**: SSE transport in MyMCP Durable Object

### Game Statistics API
- **URL**: `/api/stats`
- **Method**: GET
- **Description**: Get current game statistics
- **Handler**: GameStatsStorage Durable Object
- **Returns**: JSON with wins, draws, and live game counts

- **URL**: `/api/stats/ws`
- **Method**: GET (WebSocket upgrade)
- **Description**: Real-time statistics updates via WebSocket
- **Handler**: GameStatsStorage Durable Object with hibernation

- **URL**: `/api/stats/game-complete`
- **Method**: POST
- **Description**: Record a completed game result
- **Handler**: GameStatsStorage Durable Object
- **Body**: `{ "result": "clankers" | "carbonUnits" | "draw" }`

---

## 🛠️ MCP Tools (Available after connecting to `/mcp`)

### Built-in Tools

#### `showExternalUrl`
- **Description**: Display an external URL in iframe (example: example.com)
- **Parameters**: None
- **Returns**: UI resource with external website

#### `showRawHtml`
- **Description**: Render raw HTML content directly
- **Parameters**: None
- **Returns**: UI resource with HTML string

#### `showRemoteDom`
- **Description**: Execute JavaScript that builds DOM dynamically
- **Parameters**: None
- **Returns**: UI resource with remote DOM script

#### `showTicTacToeGame`
- **Description**: Launch the TicTacToe game UI
- **Parameters**: None
- **Returns**: UI resource pointing to root `/` with iframe
- **Side Effects**: Game registers 3 additional WebMCP tools after loading

#### `tictactoe_get_stats`
- **Description**: Get global TicTacToe game statistics
- **Parameters**: None
- **Returns**: Markdown with Clankers vs Carbon Units stats

### Dynamic Tools (WebMCP - registered after game loads)

#### `tictactoe_get_state`
- **Description**: Get current Tic-Tac-Toe board state
- **Parameters**: None
- **Returns**: Markdown with board state, player roles, available moves

#### `tictactoe_ai_move`
- **Description**: Make a move as the AI player (Clankers)
- **Parameters**:
  - `position` (0-8): Cell position to place move
- **Returns**: Markdown with move result and updated board

#### `tictactoe_reset`
- **Description**: Reset the board and start a new game
- **Parameters**: None
- **Returns**: Markdown confirming reset

---

## 📁 File Structure → URL Mapping

```
src/                    → /  (TicTacToe app)
├── main.tsx
├── TicTacToe.tsx
├── TicTacToeWithWebMCP.tsx
└── ...

worker/                 → /mcp, /sse, /api/*
├── index.ts
├── mcpServer.ts
└── gameStatsStorage.ts
```

---

## 🚀 Route Examples

### Development URLs (local)
```
http://localhost:8888/                     # TicTacToe app
http://localhost:8888/mcp                  # MCP protocol endpoint
http://localhost:8888/sse                  # SSE endpoint
http://localhost:8888/api/stats            # Get game statistics
http://localhost:8888/api/stats/ws         # WebSocket for real-time stats
```

### Production URLs (deployed)
```
https://your-worker.workers.dev/                    # TicTacToe app
https://your-worker.workers.dev/mcp                 # MCP protocol
https://your-worker.workers.dev/sse                 # SSE endpoint
https://your-worker.workers.dev/api/stats           # Statistics
https://your-worker.workers.dev/api/stats/ws        # Stats WebSocket
```

---

## 🎯 Route Priority (Hono Middleware Order)

1. **CORS middleware** (`/*`) → Adds CORS headers
2. **POST `/mcp`** → MCP protocol handler
3. **ALL `/sse` and `/sse/*`** → SSE handler
4. **GET `/api/stats`** → Statistics endpoint
5. **GET `/api/stats/ws`** → WebSocket upgrade
6. **POST `/api/stats/game-complete`** → Record game result
7. **404 Handler** → Returns JSON error for unmatched routes

Note: Static assets are served by Cloudflare Workers' Assets binding in production, or by Vite dev server in development (via `@cloudflare/vite-plugin`).

---

## 🔍 Debugging Routes

### Test routes locally:
```bash
# Start dev server
pnpm dev

# Test routes
curl http://localhost:8888/                     # TicTacToe app HTML
curl http://localhost:8888/mcp                  # MCP endpoint (requires POST)
curl http://localhost:8888/api/stats            # Get statistics JSON
```

### View Worker logs:
```bash
# Local development
pnpm dev  # Logs appear in terminal

# Production
wrangler tail
```

---

## 📊 Route Performance

| Route | Type | Typical Load Time | Cached? |
|-------|------|-------------------|---------|
| `/` (TicTacToe) | Static HTML + JS | ~50-100ms | Yes (CDN) |
| `/mcp` | Durable Object | ~100-200ms | No |
| `/sse` | SSE Stream | ~10-50ms | No |
| `/api/stats` | Durable Object | ~50-100ms | No |
| `/api/stats/ws` | WebSocket | ~10ms (upgrade) | No |

Static assets (HTML, CSS, JS) are cached by Cloudflare's global CDN for optimal performance.

---

## 🔗 Adding More Routes

To add new API routes, edit `worker/index.ts`:

```typescript
// Example: Add a new API route
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});
```

To add more MCP tools, edit `worker/mcpServer.ts`:

```typescript
async init() {
  this.server.tool(
    "myNewTool",
    "Description of what it does",
    {},
    async () => {
      return {
        content: [{ type: "text", text: "Tool result" }]
      };
    }
  );
}
```
