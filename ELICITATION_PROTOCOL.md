# Rich Elicitation Protocol Implementation

This document describes the implementation of the Rich Elicitation with UI Delegation protocol in the mcp-ui-webmcp project, using a color picker app as a demonstration.

## Overview

The Rich Elicitation Protocol extends the MCP Elicitation Protocol to support UI delegation, enabling servers to request structured input via custom UI components while maintaining Host control over validation and security.

## Implementation Components

### 1. Type Definitions

**Location:** `/apps/mcp-server/worker/elicitation-types.ts`

Defines TypeScript interfaces for:
- `ElicitationUI` - UI delegation configuration
- `ElicitationCreateParams` - Extended elicitation request parameters
- `ElicitationContextNotification` - Host → Guest UI notification
- `ElicitationSubmission` - Guest UI → Host submission
- `ElicitationResult` - Validated result from Host to Server

### 2. Color Picker UI Component

**Location:** `/apps/mcp-server/src/ColorPickerApp.tsx`

A React component demonstrating the Guest UI side of the protocol:

**Features:**
- Listens for `ui/notifications/elicitation-context` from Host
- Renders an interactive color picker interface
- Supports preset colors and custom hex input
- Optional color naming
- Sends `ui/submit-elicitation` with user's selection
- Handles validation errors from Host
- Supports theme preferences (light/dark)

**Build Configuration:**
- Entry point: `/apps/mcp-server/src/color-picker-main.tsx`
- HTML template: `/apps/mcp-server/color-picker.html`
- Built as separate page in multi-page Vite config

### 3. MCP Server Tool

**Location:** `/apps/mcp-server/worker/mcpServer.ts` (Tool: `chooseColor`)

Demonstrates server-side elicitation request:

```typescript
{
  message: "Please select a color for your theme",
  requestedSchema: {
    type: "object",
    properties: {
      color: {
        type: "string",
        pattern: "^#[0-9a-fA-F]{6}$",
        description: "Hex color code"
      },
      name: {
        type: "string",
        description: "Optional color name"
      }
    },
    required: ["color"]
  },
  ui: {
    uri: "ui://color-picker",
    mode: "modal",
    context: {
      defaultColor: "#3b82f6",
      theme: "light"
    }
  }
}
```

### 4. Host Implementation

**Location:** `/apps/chat-ui/src/hooks/useElicitationProtocol.ts`

A React hook managing the Host side of the protocol:

**Responsibilities:**
1. **Detection** - Identifies elicitation requests in tool results
2. **Context Notification** - Sends `ui/notifications/elicitation-context` to Guest UI
3. **Submission Handling** - Receives `ui/submit-elicitation` from Guest UI
4. **Schema Validation** - Validates submissions against `requestedSchema` using AJV
5. **Error Feedback** - Sends validation errors back to UI for correction
6. **Result Forwarding** - Forwards validated results to server

**Key Methods:**
- `registerElicitation()` - Register an elicitation request and return a promise
- `detectElicitation()` - Check if tool result contains elicitation metadata
- `sendElicitationContext()` - Send context to Guest UI
- `validateSubmission()` - Validate against JSON Schema

## Protocol Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Server  │         │   Host   │         │ Guest UI │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │ 1. Tool call       │                    │
     │   with elicitation │                    │
     │   metadata         │                    │
     ├───────────────────>│                    │
     │                    │                    │
     │                    │ 2. Spawn iframe    │
     │                    │    and connect     │
     │                    ├───────────────────>│
     │                    │                    │
     │                    │ 3. ui-lifecycle-   │
     │                    │    iframe-ready    │
     │                    │<───────────────────┤
     │                    │                    │
     │                    │ 4. ui/notifications│
     │                    │    /elicitation-   │
     │                    │    context         │
     │                    ├───────────────────>│
     │                    │                    │
     │                    │                    │ 5. User
     │                    │                    │    interacts
     │                    │                    │
     │                    │ 6. ui/submit-      │
     │                    │    elicitation     │
     │                    │<───────────────────┤
     │                    │                    │
     │                    │ 7. Validate        │
     │                    │    against schema  │
     │                    │                    │
     ├─────── If invalid ─┤                    │
     │                    │ 8. Re-send context │
     │                    │    with error      │
     │                    ├───────────────────>│
     │                    │                    │
     ├─────── If valid ───┤                    │
     │ 9. Forward result  │                    │
     │<───────────────────┤                    │
     │                    │                    │
```

## Message Formats

### 1. Elicitation Context (Host → Guest UI)

```json
{
  "jsonrpc": "2.0",
  "method": "ui/notifications/elicitation-context",
  "params": {
    "message": "Please select a color for your theme",
    "schema": {
      "type": "object",
      "properties": {
        "color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "name": { "type": "string" }
      },
      "required": ["color"]
    },
    "context": {
      "defaultColor": "#3b82f6",
      "theme": "light"
    }
  }
}
```

### 2. Elicitation Submission (Guest UI → Host)

```json
{
  "jsonrpc": "2.0",
  "method": "ui/submit-elicitation",
  "params": {
    "action": "accept",
    "content": {
      "color": "#3b82f6",
      "name": "Ocean Blue"
    }
  }
}
```

**Actions:**
- `accept` - User submitted valid data
- `decline` - User explicitly declined
- `cancel` - User cancelled the operation

## Security & Validation

### Schema Validation

The Host **MUST** validate all submissions against `requestedSchema` before forwarding to the server:

1. **Validation Library:** AJV (JSON Schema validator)
2. **Validation Point:** `useElicitationProtocol.validateSubmission()`
3. **Error Handling:** Validation failures are sent back to Guest UI for correction
4. **Schema Authority:** `requestedSchema` from server is the source of truth

### Context Sanitization

- Host treats `ui.context` as untrusted data
- Standard JSON serialization prevents code injection
- Guest UI sanitizes error messages before display

### Security Constraints

1. Host validates **before** forwarding to server
2. Invalid submissions are **never** sent to server
3. Guest UI cannot bypass validation
4. Schema enforcement is mandatory

## Usage Example

### Server Side

```typescript
this.server.tool('chooseColor', '...', {
  defaultColor: { type: 'string', optional: true },
  theme: { type: 'string', optional: true },
}, async ({ defaultColor, theme }) => {
  const uiResource = createUIResource({
    uri: 'ui://color-picker',
    content: {
      type: 'externalUrl',
      iframeUrl: `${this.env.APP_URL}/color-picker.html`,
    },
    encoding: 'blob',
  });

  return {
    content: [uiResource],
    metadata: {
      elicitation: {
        message: 'Please select a color for your theme',
        requestedSchema: {
          type: 'object',
          properties: {
            color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
            name: { type: 'string' }
          },
          required: ['color']
        },
        ui: {
          uri: 'ui://color-picker',
          mode: 'modal',
          context: { defaultColor, theme }
        }
      }
    }
  };
});
```

### Guest UI Side

```typescript
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.method === 'ui/notifications/elicitation-context') {
      setElicitationContext(event.data.params);
      if (event.data.params.context?.defaultColor) {
        setSelectedColor(event.data.params.context.defaultColor);
      }
    }
  };

  window.addEventListener('message', handleMessage);
  window.parent.postMessage({ type: 'ui-lifecycle-iframe-ready' }, '*');

  return () => window.removeEventListener('message', handleMessage);
}, []);

const handleSubmit = () => {
  window.parent.postMessage({
    jsonrpc: '2.0',
    method: 'ui/submit-elicitation',
    params: {
      action: 'accept',
      content: { color: selectedColor, name: colorName }
    }
  }, '*');
};
```

### Host Side

```typescript
const { registerElicitation, detectElicitation } = useElicitationProtocol();

// After tool call
const elicitation = detectElicitation(toolResult);
if (elicitation && iframeRef.current) {
  const result = await registerElicitation(iframeRef.current, elicitation);

  if (result.action === 'accept') {
    console.log('User selected:', result.content);
    // Forward to server
  }
}
```

## Testing

### Manual Testing

1. **Build the applications:**
   ```bash
   pnpm --filter mcp-server build
   pnpm --filter chat-ui build
   ```

2. **Start the development servers:**
   ```bash
   pnpm dev
   ```

3. **Test the color picker:**
   - Navigate to the chat UI
   - Call the `chooseColor` tool
   - Verify the color picker UI loads
   - Select a color and submit
   - Verify the Host validates the submission
   - Check that the result is forwarded correctly

### Validation Testing

Test various scenarios:
- ✅ Valid color selection (#3b82f6)
- ❌ Invalid color format (missing #)
- ❌ Invalid hex digits (#gggggg)
- ✅ With optional color name
- ✅ Without color name
- ✅ Cancel action
- ✅ Decline action

## Files Modified/Created

### New Files
1. `/apps/mcp-server/src/ColorPickerApp.tsx` - Color picker UI component
2. `/apps/mcp-server/src/color-picker-main.tsx` - Entry point
3. `/apps/mcp-server/color-picker.html` - HTML template
4. `/apps/mcp-server/worker/elicitation-types.ts` - Type definitions
5. `/apps/chat-ui/src/hooks/useElicitationProtocol.ts` - Host implementation
6. `/ELICITATION_PROTOCOL.md` - This documentation

### Modified Files
1. `/apps/mcp-server/vite.config.ts` - Multi-page build support
2. `/apps/mcp-server/worker/mcpServer.ts` - Added `chooseColor` tool
3. `/apps/chat-ui/package.json` - Added `ajv` dependency

## Future Enhancements

1. **Real Elicitation API:** Implement actual `elicitation/create` and `elicitation/result` RPC methods
2. **Multiple Elicitations:** Support concurrent elicitation requests
3. **Progress Indicators:** Show validation progress in UI
4. **Custom Validators:** Support custom validation beyond JSON Schema
5. **Retry Logic:** Automatic retry with backoff for network failures
6. **Accessibility:** Enhanced keyboard navigation and screen reader support

## References

- [Original Proposal](./proposal.md) - Full Rich Elicitation specification
- [MCP Protocol](https://modelcontextprotocol.io/) - Model Context Protocol
- [JSON Schema](https://json-schema.org/) - Validation standard
- [AJV](https://ajv.js.org/) - JSON Schema validator

## License

AGPL-3.0 - See LICENSE file for details
