# Testing Your WebMCP Embedded App

This guide covers everything you need to know about testing your WebMCP application.

## 📋 Table of Contents

- [Testing Strategies](#testing-strategies)
- [Local Development Testing](#local-development-testing)
- [Testing WebMCP Tools](#testing-webmcp-tools)
- [Integration Testing](#integration-testing)
- [Debugging Tips](#debugging-tips)
- [Common Issues](#common-issues)

## Testing Strategies

### Three Levels of Testing

1. **UI Testing** - Test your React components directly
2. **Tool Testing** - Test WebMCP tools in isolation
3. **Integration Testing** - Test the full MCP server + app flow

## Local Development Testing

### 1. Test the UI Directly

Visit your app directly in the browser:

```bash
pnpm dev
# Open http://localhost:8888 in your browser
```

**What to test:**
- ✅ UI renders correctly
- ✅ User interactions work
- ✅ State updates properly
- ✅ No console errors

### 2. Test with Browser DevTools

Open Chrome DevTools (F12) and check:

**Console Tab:**
```javascript
// You should see WebMCP initialization
[WebMCP] Initialized
[WebMCP] Tool registered: template_get_message
[WebMCP] Tool registered: template_update_message
```

**Network Tab:**
- Check for failed requests
- Verify iframe is loaded correctly

**Application Tab:**
- Check localStorage/sessionStorage if you're using it

### 3. Test Parent Communication

Open the console and manually test postMessage:

```javascript
// Send a test message to the iframe
window.frames[0].postMessage({ type: 'parent_ready' }, '*');

// Listen for messages from iframe
window.addEventListener('message', (e) => {
  console.log('Message from iframe:', e.data);
});
```

## Testing WebMCP Tools

### Method 1: Direct Console Testing

Add a test function to your app:

```typescript
// In src/App.tsx
useEffect(() => {
  // Expose test functions globally (development only)
  if (import.meta.env.DEV) {
    (window as any).testTools = {
      getMessage: async () => {
        const result = await /* your handler logic */;
        console.log('Result:', result);
      },
      updateMessage: async (msg: string) => {
        // your handler logic
      },
    };
  }
}, []);
```

Then in the browser console:

```javascript
// Test your tools
await testTools.getMessage();
await testTools.updateMessage('Hello!');
```

### Method 2: Tool Logger Component

Create a debug component:

```typescript
function ToolLogger() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'tool_call') {
        setLogs(prev => [...prev, `Tool called: ${e.data.name}`]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 bg-black/80 text-white p-4 max-h-48 overflow-auto">
      {logs.map((log, i) => <div key={i}>{log}</div>)}
    </div>
  );
}
```

### Method 3: Connect with an MCP Client

Test the full flow with an AI assistant:

1. **Start your server**:
   ```bash
   pnpm dev
   ```

2. **Connect via MCP client** (e.g., Claude Desktop):
   - Add server: `http://localhost:8888/mcp`
   - Or use SSE: `http://localhost:8888/sse`

3. **Test your tools**:
   ```
   User: "Show me the template app"
   AI: [Calls showTemplateApp tool]

   User: "Get the current message"
   AI: [Calls template_get_message tool]
   ```

## Integration Testing

### Testing the Full MCP Flow

1. **Start the dev server**:
   ```bash
   pnpm dev
   ```

2. **Check MCP endpoint is working**:
   ```bash
   curl http://localhost:8888/mcp
   ```

3. **Test SSE endpoint**:
   ```bash
   curl -N -H "Accept: text/event-stream" http://localhost:8888/sse
   ```

### Testing Tool Registration

Check that tools are registered correctly:

```typescript
// In your app
useEffect(() => {
  const checkRegistration = async () => {
    // Wait a bit for tools to register
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if tools are registered
    console.log('[WebMCP] Tools should be registered now');
  };

  if (isReady) {
    checkRegistration();
  }
}, [isReady]);
```

### Testing with E2E Tests (Advanced)

For automated testing, consider using Playwright:

```typescript
import { test, expect } from '@playwright/test';

test('app loads and registers tools', async ({ page }) => {
  // Navigate to your app
  await page.goto('http://localhost:8888');

  // Wait for app to be ready
  await page.waitForSelector('text=Connected');

  // Check console for WebMCP messages
  const logs: string[] = [];
  page.on('console', msg => logs.push(msg.text()));

  // Wait a bit
  await page.waitForTimeout(1000);

  // Verify tools registered
  expect(logs.some(log => log.includes('Tool registered'))).toBeTruthy();
});
```

## Debugging Tips

### Enable Verbose Logging

Add detailed logging throughout your app:

```typescript
const DEBUG = import.meta.env.DEV;

function log(message: string, ...args: any[]) {
  if (DEBUG) {
    console.log(`[App] ${message}`, ...args);
  }
}

// Use throughout your code
log('Component mounted');
log('Tool called', { toolName: 'my_tool' });
log('State updated', { newState });
```

### Debug WebMCP Tool Handlers

Wrap your handlers with logging:

```typescript
useWebMCP({
  name: 'my_tool',
  handler: async (params) => {
    console.log('[Tool:my_tool] Called with params:', params);

    try {
      const result = await doSomething(params);
      console.log('[Tool:my_tool] Success:', result);
      return result;
    } catch (error) {
      console.error('[Tool:my_tool] Error:', error);
      throw error;
    }
  },
});
```

### Debug Parent Communication

Monitor all postMessage traffic:

```typescript
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    console.log('[PostMessage] Received:', {
      type: event.data?.type,
      data: event.data,
      origin: event.origin,
    });
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

### Check Worker Logs

If using Wrangler in dev mode:

```bash
# Worker logs appear in the terminal where you ran 'pnpm dev'
# Look for errors or warnings there
```

For deployed workers:

```bash
wrangler tail
```

## Common Issues

### Issue 1: Tools Not Registering

**Symptoms:**
- AI says "Tool not found"
- Tools don't appear in the AI's tool list

**Debug Steps:**

1. Check browser console for errors
2. Verify `initializeWebModelContext` is called in `main.tsx`
3. Ensure parent ready event is received:
   ```typescript
   useEffect(() => {
     console.log('[Debug] Waiting for parent ready...');
     const handler = (e: MessageEvent) => {
       console.log('[Debug] Message received:', e.data);
       if (e.data?.type === 'parent_ready') {
         console.log('[Debug] Parent is ready!');
         setIsReady(true);
       }
     };
     window.addEventListener('message', handler);
     return () => window.removeEventListener('message', handler);
   }, []);
   ```

### Issue 2: State Not Updating

**Symptoms:**
- Tool handler runs but UI doesn't update
- Stale state in tool handlers

**Solution:**
Use the functional form of setState:

```typescript
// ❌ Wrong - may use stale state
setCount(count + 1);

// ✅ Correct - always uses latest state
setCount(prev => prev + 1);
```

### Issue 3: Tool Returns Wrong Data

**Symptoms:**
- Tool handler returns old/stale data
- State updates happen after tool returns

**Solution:**
Return a promise or use the latest state:

```typescript
// Use functional setState and return the new value
useWebMCP({
  name: 'increment',
  handler: async () => {
    let newValue = 0;
    setCount(prev => {
      newValue = prev + 1;
      return newValue;
    });
    return `New count: ${newValue}`;
  },
});
```

### Issue 4: Iframe Not Loading

**Symptoms:**
- Blank screen in AI assistant
- Console shows CSP errors

**Debug Steps:**

1. Check `.dev.vars` has correct `APP_URL`
2. Verify dev server is running: `curl http://localhost:8888`
3. Check for CSP/CORS errors in console
4. Try opening the URL directly in a new tab

### Issue 5: Parent Not Ready

**Symptoms:**
- App stuck on "Connecting..."
- Parent ready event never fires

**Solution:**

Ensure you're sending the ready message:

```typescript
useEffect(() => {
  // Send ready message to parent
  window.parent.postMessage({ type: 'iframe_ready' }, '*');

  // Set up listener
  const handler = (e: MessageEvent) => {
    if (e.data?.type === 'parent_ready') {
      setIsReady(true);
    }
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}, []);
```

## Testing Checklist

Before deploying, verify:

- [ ] App loads without errors
- [ ] All WebMCP tools register successfully
- [ ] Tools can be called from AI assistant
- [ ] State updates work correctly
- [ ] UI interactions work as expected
- [ ] Parent communication works
- [ ] No console errors
- [ ] Environment variables are set correctly
- [ ] Build completes successfully (`pnpm build`)
- [ ] Production URL is updated in `.prod.vars`

## Advanced: Manual Tool Testing Script

Create a test script to manually test tools:

```typescript
// test-tools.ts
import { initializeWebModelContext } from '@mcp-b/react-webmcp';

async function testTools() {
  // Initialize WebMCP
  initializeWebModelContext({});

  // Register test tools
  const { useWebMCP } = await import('@mcp-b/react-webmcp');

  // Your test logic here
  console.log('Tools registered, ready for testing');
}

testTools();
```

---

**Need more help?** Check the [main README](./README.md) or [QUICKSTART guide](./QUICKSTART.md)!
