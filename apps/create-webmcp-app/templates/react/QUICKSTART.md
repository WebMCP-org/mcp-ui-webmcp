# WebMCP Template - Quick Start Guide

This guide walks you through building your own embedded app with WebMCP, step by step.

## 📋 Table of Contents

- [Understanding the Template](#understanding-the-template)
- [Building Your First App](#building-your-first-app)
- [Adding WebMCP Tools](#adding-webmcp-tools)
- [Testing Your App](#testing-your-app)
- [Common Patterns](#common-patterns)
- [Next Steps](#next-steps)

## Understanding the Template

### What Gets Executed Where?

The template has **two parts** that run in different environments:

1. **MCP Server** (`worker/mcpServer.ts`)
   - Runs on Cloudflare Workers
   - Handles AI assistant requests
   - Serves your embedded app via iframe

2. **Embedded App** (`src/App.tsx`)
   - Runs in the user's browser (inside an iframe)
   - Registers WebMCP tools dynamically
   - Handles user interactions

### Communication Flow

```
AI Assistant <-> MCP Server <-> Embedded App (iframe)
     ↑               ↑                 ↑
  Calls tools   Routes tools    Registers tools
```

## Building Your First App

Let's build a simple counter app from scratch!

### Step 1: Update the App Component

Replace `src/App.tsx` with your counter logic:

```typescript
import { useWebMCP } from '@mcp-b/react-webmcp';
import { useEffect, useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Listen for parent ready event
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'parent_ready') {
        setIsReady(true);
      }
    };

    window.addEventListener('message', handleMessage);
    window.parent.postMessage({ type: 'iframe_ready' }, '*');

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Register WebMCP tool to get count
  useWebMCP({
    name: 'counter_get_value',
    description: 'Get the current counter value',
    handler: async () => {
      return `Current count: ${count}`;
    },
  });

  // Register WebMCP tool to increment
  useWebMCP({
    name: 'counter_increment',
    description: 'Increment the counter by 1',
    handler: async () => {
      setCount(prev => prev + 1);
      return `Counter incremented! New value: ${count + 1}`;
    },
  });

  // Register WebMCP tool to decrement
  useWebMCP({
    name: 'counter_decrement',
    description: 'Decrement the counter by 1',
    handler: async () => {
      setCount(prev => prev - 1);
      return `Counter decremented! New value: ${count - 1}`;
    },
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">Counter App</h1>

      <div className="text-6xl font-bold text-blue-600">
        {count}
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setCount(count - 1)}
          disabled={!isReady}
          className="rounded-md bg-red-600 px-6 py-3 text-white hover:bg-red-700 disabled:bg-gray-300"
        >
          -
        </button>
        <button
          onClick={() => setCount(count + 1)}
          disabled={!isReady}
          className="rounded-md bg-green-600 px-6 py-3 text-white hover:bg-green-700 disabled:bg-gray-300"
        >
          +
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        {isReady ? '✓ Connected' : '⏳ Connecting...'}
      </div>
    </div>
  );
}
```

### Step 2: Update the MCP Tool

Edit `worker/mcpServer.ts` to reference your counter app:

```typescript
this.server.tool(
  'showCounterApp',
  `Display an interactive counter application.

After calling this tool, these WebMCP tools become available:
- counter_get_value: Get the current count
- counter_increment: Increase count by 1
- counter_decrement: Decrease count by 1`,
  {},
  async () => {
    const iframeUrl = `${this.env.APP_URL}/`;
    const uiResource = createUIResource({
      uri: 'ui://counter-app',
      content: {
        type: 'externalUrl',
        iframeUrl: iframeUrl,
      },
      encoding: 'blob',
    });

    return {
      content: [
        {
          type: 'text',
          text: `# Counter App Started

The counter is now displayed. Use these tools:
- \`counter_get_value\` - View current count
- \`counter_increment\` - Increase by 1
- \`counter_decrement\` - Decrease by 1`,
        },
        uiResource,
      ],
    };
  }
);
```

### Step 3: Test It!

```bash
# Start dev server
pnpm dev

# Connect with an AI assistant and try:
# "Show me the counter app"
# "What's the current count?"
# "Increment the counter"
```

## Adding WebMCP Tools

### Basic Tool (No Parameters)

```typescript
useWebMCP({
  name: 'my_tool',
  description: 'A simple tool with no parameters',
  handler: async () => {
    // Your logic here
    return 'Tool executed successfully!';
  },
});
```

### Tool with Parameters

```typescript
import { z } from 'zod';

useWebMCP({
  name: 'set_value',
  description: 'Set a custom value',
  inputSchema: {
    value: z.number().describe('The value to set'),
  },
  handler: async ({ value }) => {
    setValue(value);
    return `Value set to ${value}`;
  },
});
```

### Tool with Multiple Parameters

```typescript
useWebMCP({
  name: 'draw_shape',
  description: 'Draw a shape on the canvas',
  inputSchema: {
    shape: z.enum(['circle', 'square', 'triangle']).describe('Shape type'),
    x: z.number().describe('X coordinate'),
    y: z.number().describe('Y coordinate'),
    size: z.number().min(10).max(100).describe('Size in pixels'),
  },
  handler: async ({ shape, x, y, size }) => {
    drawShape(shape, x, y, size);
    return `Drew ${shape} at (${x}, ${y}) with size ${size}`;
  },
});
```

### Tool Annotations

```typescript
useWebMCP({
  name: 'delete_all',
  description: 'Delete all data (dangerous!)',
  annotations: {
    destructiveHint: true,     // Warns the AI this is destructive
    idempotentHint: false,     // Can't be safely retried
    readOnlyHint: false,       // Modifies state
  },
  handler: async () => {
    clearAllData();
    return 'All data deleted';
  },
});
```

## Testing Your App

### Local Testing

1. **Start the dev server**:
   ```bash
   pnpm dev
   ```

2. **Test the app directly**:
   - Visit http://localhost:8888
   - Interact with your UI
   - Check browser console for errors

3. **Test with MCP client**:
   - Connect to http://localhost:8888/mcp
   - Call your tools via an AI assistant

### Browser Console Debugging

Add logging to your tools:

```typescript
useWebMCP({
  name: 'my_tool',
  handler: async () => {
    console.log('[WebMCP] my_tool called');
    const result = doSomething();
    console.log('[WebMCP] Result:', result);
    return result;
  },
});
```

### Common Issues

See **[TESTING.md](./TESTING.md)** for comprehensive testing strategies!

## Common Patterns

### Pattern 1: Shared Logic Between UI and Tools

```typescript
function App() {
  // Shared logic as a function
  const updateValue = useCallback((newValue: number) => {
    setValue(newValue);
    return `Value updated to ${newValue}`;
  }, []);

  // UI button calls the shared logic
  <button onClick={() => updateValue(42)}>
    Set to 42
  </button>

  // WebMCP tool calls the same logic
  useWebMCP({
    name: 'set_value',
    inputSchema: { value: z.number() },
    handler: async ({ value }) => updateValue(value),
  });
}
```

### Pattern 2: State Synchronization

```typescript
function App() {
  const [state, setState] = useState({ /* ... */ });

  // Notify parent when state changes
  useEffect(() => {
    if (isReady) {
      window.parent.postMessage({
        type: 'state_changed',
        state: state
      }, '*');
    }
  }, [state, isReady]);
}
```

### Pattern 3: Read-Only vs Mutating Tools

```typescript
// Read-only tool (safe to call anytime)
useWebMCP({
  name: 'get_data',
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
  handler: async () => data,
});

// Mutating tool (changes state)
useWebMCP({
  name: 'update_data',
  annotations: {
    readOnlyHint: false,
    idempotentHint: false,
  },
  handler: async () => {
    setData(newData);
    return 'Updated';
  },
});
```

### Pattern 4: Validation and Error Handling

```typescript
useWebMCP({
  name: 'make_move',
  inputSchema: {
    position: z.number().min(0).max(8),
  },
  handler: async ({ position }) => {
    // Validate game state
    if (gameOver) {
      throw new Error('Game is over');
    }

    if (board[position] !== null) {
      throw new Error('Position already taken');
    }

    // Execute move
    makeMove(position);
    return `Move made at position ${position}`;
  },
});
```

## Next Steps

### Want to Build a Game?

Use the **Game Builder Prompt** to scaffold common games:
- See the prompt in `worker/mcpServer.ts` (we'll add one for you!)
- Just tell the AI what game you want to build

### Want to Learn More?

- **[TESTING.md](./TESTING.md)** - Comprehensive testing guide
- **[../../CONTRIBUTING.md](../../CONTRIBUTING.md)** - Development standards
- **[../../apps/mcp-server/README.md](../../apps/mcp-server/README.md)** - Full-featured example (Tic-Tac-Toe)

### Deployment

When ready to deploy:

1. Update `.prod.vars` with your Cloudflare Workers URL
2. Run `pnpm deploy`
3. Test at your production URL

---

**Happy Building!** 🚀
