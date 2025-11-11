# Security Best Practices for Cross-Origin Iframe Embedding

This document outlines security best practices for embedding cross-origin iframes in the WebMCP ecosystem, enabling embedded applications to maintain their own authentication while protecting both parent and child contexts from security risks.

## Table of Contents

- [Overview](#overview)
- [Threat Model](#threat-model)
- [Security Mechanisms](#security-mechanisms)
- [Implementation Guide](#implementation-guide)
- [Best Practices Checklist](#best-practices-checklist)
- [Platform Capabilities](#platform-capabilities)
- [Additional Resources](#additional-resources)

## Overview

WebMCP enables bidirectional communication between AI assistants and embedded web applications via iframes. This powerful capability requires careful security implementation to protect against:

- Cross-site tracking and privacy violations
- Clickjacking and UI confusion attacks
- Cross-site leaks (XS-Leaks)
- Unintended network access by embedded apps
- Confused deputy vulnerabilities in postMessage communication

## Threat Model

### Threats to Neutralize

1. **Tracking & Privacy**: Third-party cookies/state can track users across sites
2. **Host Control & Policy**: Hosts need to constrain what embedded apps can connect to
3. **Clickjacking & UI Confusion**: Malicious parent can trick users into interacting with child (or vice-versa)
4. **XS-Leaks**: Side channels between parent and child that leak state even with Same-Origin Policy
5. **COEP/COOP Compatibility**: Cross-origin isolation requirements can strip credentials

## Security Mechanisms

### 1. Content Security Policy (CSP)

CSP headers control what resources embedded iframes can load and connect to.

#### Basic CSP for Parent Page

```http
Content-Security-Policy:
  default-src 'self';
  frame-src https://trusted-embed.example.com;
  connect-src 'self' https://api.example.com;
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
```

#### CSP Embedded Enforcement (CEE)

Use the `csp` attribute on iframes to enforce a required CSP on the child:

```html
<iframe
  src="https://trusted-embed.example.com"
  csp="default-src 'self'; connect-src 'self' https://api.trusted-embed.example.com; script-src 'self'"
  sandbox="allow-same-origin allow-scripts allow-forms"
></iframe>
```

**Key Benefit**: The parent can grant `allow-same-origin` (giving the child real credentials) while still constraining the child's network access via `connect-src`.

### 2. Iframe Sandbox Attributes

The `sandbox` attribute restricts iframe capabilities. Use the principle of least privilege.

#### Recommended Sandbox Configuration

```html
<iframe
  src="https://embed.example.com"
  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
></iframe>
```

**Sandbox Flags Explained**:

- `allow-same-origin`: Allows iframe to access its own origin's cookies/storage (required for authentication)
- `allow-scripts`: Enables JavaScript execution (required for WebMCP)
- `allow-forms`: Allows form submission
- `allow-popups`: Permits opening popups (use cautiously)
- `allow-popups-to-escape-sandbox`: Allows popups to escape sandbox restrictions

**⚠️ WARNING**: Never combine `allow-scripts` with `allow-same-origin` unless you trust the embedded origin completely. This combination effectively removes sandbox protection.

#### Minimal Sandbox (for untrusted content)

```html
<iframe
  src="https://untrusted.example.com"
  sandbox="allow-scripts"
></iframe>
```

This configuration:
- ✅ Allows scripts to run
- ❌ Blocks access to cookies/storage
- ❌ Blocks form submission
- ❌ Blocks popups
- ❌ Treats iframe as cross-origin

### 3. Permissions Policy (formerly Feature Policy)

Control what browser features the iframe can access.

```html
<iframe
  src="https://embed.example.com"
  sandbox="allow-same-origin allow-scripts allow-forms"
  allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'"
></iframe>
```

**Via HTTP Header (in parent page)**:

```http
Permissions-Policy:
  camera=(),
  microphone=(),
  geolocation=(),
  payment=(),
  storage-access=(self "https://trusted-embed.example.com")
```

**Common permissions to control**:
- `camera`, `microphone`: Media access
- `geolocation`: Location services
- `payment`: Payment Request API
- `storage-access`: Storage Access API (for cookie access)
- `clipboard-read`, `clipboard-write`: Clipboard access
- `fullscreen`: Fullscreen mode

### 4. Partitioned Cookies (CHIPS)

Use partitioned cookies to enable per-site authentication without cross-site tracking.

**In the embedded app's server response**:

```http
Set-Cookie: session=abc123;
  SameSite=None;
  Secure;
  Partitioned;
  Path=/;
  Max-Age=86400
```

**Benefits**:
- Cookies are keyed by (embedded-origin, top-level-site)
- Embedded app can maintain separate sessions per parent site
- Prevents cross-site tracking
- No user consent required (unlike Storage Access API)

**Browser Support**:
- ✅ Chrome/Edge 118+ (full support)
- ⚠️ Safari/Firefox (partitioning enabled, but explicit `Partitioned` flag not required)

### 5. Origin Validation in postMessage

**ALWAYS** validate message origins and specify target origins.

#### ❌ Insecure (DO NOT USE)

```javascript
// INSECURE: Accepts messages from any origin
window.addEventListener('message', (event) => {
  handleMessage(event.data);
});

// INSECURE: Sends to any origin
window.parent.postMessage(message, '*');
```

#### ✅ Secure Implementation

**In parent page (host)**:

```javascript
const ALLOWED_IFRAME_ORIGINS = [
  'https://trusted-embed.example.com',
  'http://localhost:8888', // Development only
];

window.addEventListener('message', (event) => {
  // Validate origin
  if (!ALLOWED_IFRAME_ORIGINS.includes(event.origin)) {
    console.warn('Rejected message from unauthorized origin:', event.origin);
    return;
  }

  // Validate message structure
  if (!isValidMessage(event.data)) {
    console.warn('Rejected invalid message:', event.data);
    return;
  }

  // Validate source
  const iframe = document.getElementById('trusted-iframe');
  if (event.source !== iframe?.contentWindow) {
    console.warn('Message source does not match expected iframe');
    return;
  }

  // Process message
  handleMessage(event.data);
});

function isValidMessage(data: unknown): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    typeof data.type === 'string' &&
    'payload' in data
  );
}
```

**In embedded iframe (child)**:

```javascript
const PARENT_ORIGIN = 'https://parent.example.com';

window.addEventListener('message', (event) => {
  // Validate parent origin
  if (event.origin !== PARENT_ORIGIN) {
    console.warn('Rejected message from unauthorized origin:', event.origin);
    return;
  }

  // Validate message
  if (!isValidMessage(event.data)) {
    return;
  }

  handleMessage(event.data);
});

// Send messages with specific target origin
function sendToParent(message: object) {
  window.parent.postMessage(message, PARENT_ORIGIN);
}
```

### 6. CORS Configuration

Restrict CORS headers to specific origins in production.

#### ❌ Development (Permissive)

```typescript
// apps/chat-ui/worker/index.ts
const getCorsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
});
```

#### ✅ Production (Restrictive)

```typescript
const ALLOWED_ORIGINS = [
  'https://app.example.com',
  'https://chat.example.com',
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Device-ID',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

app.use('/*', async (c, next) => {
  const origin = c.req.header('Origin');

  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin)
    });
  }

  await next();

  const headers = getCorsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => {
    c.res.headers.set(key, value);
  });
});
```

### 7. Cross-Origin Resource Policy (CORP)

Protect resources from being loaded cross-origin.

```http
Cross-Origin-Resource-Policy: same-site
```

Or for more restrictive:

```http
Cross-Origin-Resource-Policy: same-origin
```

**Use Case**: Prevents malicious sites from embedding your resources in `<img>`, `<script>`, `<iframe>`, etc.

### 8. Storage Access API

For scenarios where partitioned cookies aren't sufficient, use the Storage Access API to request unpartitioned cookie access.

**In embedded iframe**:

```typescript
async function requestStorageAccess() {
  try {
    // Check if access is needed
    const hasAccess = await document.hasStorageAccess();
    if (hasAccess) {
      console.log('Already has storage access');
      return true;
    }

    // Request access (requires user gesture)
    await document.requestStorageAccess();
    console.log('Storage access granted');
    return true;
  } catch (error) {
    console.error('Storage access denied:', error);
    return false;
  }
}

// Call on user interaction
button.addEventListener('click', async () => {
  const granted = await requestStorageAccess();
  if (granted) {
    // Now can access unpartitioned cookies
    await authenticateUser();
  }
});
```

**Parent configuration** (via Permissions-Policy):

```http
Permissions-Policy: storage-access=(self "https://trusted-embed.example.com")
```

## Implementation Guide

### Complete Example: Secure Iframe Embedding

**Parent HTML**:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    frame-src https://embed.example.com;
    connect-src 'self' https://api.example.com;
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
  ">
  <meta http-equiv="Permissions-Policy" content="
    camera=(),
    microphone=(),
    geolocation=(),
    storage-access=(self 'https://embed.example.com')
  ">
</head>
<body>
  <iframe
    id="trusted-embed"
    src="https://embed.example.com"
    sandbox="allow-same-origin allow-scripts allow-forms"
    csp="default-src 'self'; connect-src 'self' https://api.embed.example.com;"
    allow="storage-access 'src'"
    style="width: 100%; height: 600px; border: none;"
  ></iframe>

  <script>
    const IFRAME_ORIGIN = 'https://embed.example.com';
    const iframe = document.getElementById('trusted-embed');

    // Listen for messages from iframe
    window.addEventListener('message', (event) => {
      if (event.origin !== IFRAME_ORIGIN) {
        console.warn('Unauthorized origin:', event.origin);
        return;
      }

      if (event.source !== iframe.contentWindow) {
        console.warn('Message source mismatch');
        return;
      }

      handleIframeMessage(event.data);
    });

    function handleIframeMessage(data) {
      console.log('Received from iframe:', data);

      switch (data.type) {
        case 'ui-lifecycle-iframe-ready':
          iframe.contentWindow.postMessage({
            type: 'parent-ready',
            payload: { theme: 'dark' }
          }, IFRAME_ORIGIN);
          break;

        case 'tool':
          executeTool(data.payload.toolName, data.payload.params);
          break;

        default:
          console.log('Unknown message type:', data.type);
      }
    }
  </script>
</body>
</html>
```

**Embedded App JavaScript**:

```typescript
const PARENT_ORIGIN = 'https://parent.example.com';

// Notify parent that iframe is ready
window.parent.postMessage(
  { type: 'ui-lifecycle-iframe-ready' },
  PARENT_ORIGIN
);

// Listen for messages from parent
window.addEventListener('message', (event) => {
  if (event.origin !== PARENT_ORIGIN) {
    return;
  }

  handleParentMessage(event.data);
});

function handleParentMessage(data: unknown) {
  if (!isValidMessage(data)) return;

  switch (data.type) {
    case 'parent-ready':
      initializeApp(data.payload);
      break;

    case 'webmcp-tool-call':
      executeTool(data.toolName, data.params, data.callId);
      break;
  }
}

function sendToParent(message: object) {
  window.parent.postMessage(message, PARENT_ORIGIN);
}

function isValidMessage(data: unknown): data is Message {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    typeof data.type === 'string'
  );
}
```

### WebMCP-Specific Configuration

**Initializing WebMCP with proper security**:

```typescript
import { initializeWebModelContext } from '@mcp-b/global';

// Get parent origin from environment or configuration
const PARENT_ORIGIN = import.meta.env.VITE_PARENT_ORIGIN || 'https://parent.example.com';

initializeWebModelContext({
  transport: {
    tabServer: {
      // ✅ Restrict to specific parent origins
      allowedOrigins: [PARENT_ORIGIN],

      // postMessageTarget defaults to window.parent (correct for iframes)
      // Only override if you need custom target
    },
  },
});
```

**In production environment**:

```bash
# .env.production
VITE_PARENT_ORIGIN=https://chat.example.com
```

## Best Practices Checklist

### For Iframe Parents (Host Application)

- [ ] Set CSP header restricting `frame-src` to trusted origins
- [ ] Use iframe `sandbox` attribute with minimal necessary permissions
- [ ] Use iframe `csp` attribute to enforce embedded enforcement (CEE)
- [ ] Set Permissions-Policy to deny unnecessary features
- [ ] Validate `event.origin` for all incoming postMessages
- [ ] Validate `event.source` matches expected iframe
- [ ] Use specific `targetOrigin` when sending postMessages (never `'*'`)
- [ ] Implement message schema validation
- [ ] Set restrictive CORS headers (not `'*'` in production)
- [ ] Implement timeouts for async iframe operations
- [ ] Clean up event listeners on iframe unmount
- [ ] Set `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers if using cross-origin isolation

### For Iframe Children (Embedded Application)

- [ ] Validate `event.origin` for all incoming postMessages
- [ ] Use specific `targetOrigin` when sending postMessages (never `'*'`)
- [ ] Set `frame-ancestors` CSP directive to whitelist allowed embedders
- [ ] Use partitioned cookies for per-site authentication
- [ ] Implement Storage Access API for scenarios requiring unpartitioned cookies
- [ ] Set appropriate CORS headers
- [ ] Implement message schema validation
- [ ] Set up CSP to restrict own resource loading
- [ ] Handle cases where running standalone vs. embedded
- [ ] Implement error boundaries for iframe-specific errors
- [ ] Set `Cross-Origin-Resource-Policy` to protect resources
- [ ] Test in multiple browsers (Safari, Firefox, Chrome)

## Platform Capabilities

### Available Today (Baseline Support)

1. **Partitioned Cookies (CHIPS)** - Chrome/Edge 118+, Safari/Firefox have partitioning
2. **Storage Access API** - All modern browsers (implementation varies)
3. **Iframe `sandbox` attribute** - Universal support
4. **Permissions-Policy** - Good browser support
5. **CSP** - Universal support
6. **postMessage with targetOrigin** - Universal support

### Partial Support (Use with Feature Detection)

1. **CSP Embedded Enforcement (CEE)** - Chrome only, partial Firefox
2. **COOP/COEP with credentials** - Limited, tradeoffs exist
3. **Iframe `credentialless` attribute** - Chrome only

### Best Approach for Maximum Compatibility

For **trusted embeds with authentication**:
```html
<iframe
  src="https://trusted.example.com"
  sandbox="allow-same-origin allow-scripts allow-forms"
  csp="default-src 'self'; connect-src 'self' https://api.trusted.example.com;"
  allow="storage-access 'src'"
></iframe>
```

For **untrusted content**:
```html
<iframe
  src="https://untrusted.example.com"
  sandbox="allow-scripts"
  credentialless
></iframe>
```

## Environment-Specific Configuration

### Development

```typescript
// .dev.vars or .env.development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8888
PARENT_ORIGIN=http://localhost:5173
IFRAME_ORIGIN=http://localhost:8888
```

```typescript
// Development CORS (permissive for debugging)
const isDevelopment = process.env.NODE_ENV === 'development';

const getCorsHeaders = (origin: string | null) => {
  if (isDevelopment) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*',
    };
  }

  // Production restrictive CORS
  return getProductionCorsHeaders(origin);
};
```

### Production

```typescript
// .prod.vars or .env.production
ALLOWED_ORIGINS=https://chat.example.com,https://app.example.com
PARENT_ORIGIN=https://chat.example.com
IFRAME_ORIGIN=https://embed.example.com
```

```typescript
// Production CORS (restrictive)
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [];

function getProductionCorsHeaders(origin: string | null) {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}
```

## Additional Resources

### Specifications

- [Content Security Policy Level 3](https://www.w3.org/TR/CSP3/)
- [CSP Embedded Enforcement](https://www.w3.org/TR/csp-embedded-enforcement/)
- [Permissions Policy](https://www.w3.org/TR/permissions-policy/)
- [CHIPS (Cookies Having Independent Partitioned State)](https://developers.google.com/privacy-sandbox/3pcd/chips)
- [Storage Access API](https://privacycg.github.io/storage-access/)
- [Cross-Origin-Opener-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy)
- [Cross-Origin-Embedder-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy)

### Guides

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [MDN: Window.postMessage()](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [OWASP: Clickjacking Defense](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)
- [XS-Leaks Wiki](https://xsleaks.dev/)

### Browser Compatibility

- [Can I Use: Partitioned Cookies](https://caniuse.com/mdn-http_headers_set-cookie_partitioned)
- [Can I Use: Storage Access API](https://caniuse.com/mdn-api_document_requeststorageaccess)
- [Can I Use: Permissions Policy](https://caniuse.com/permissions-policy)

---

**Note**: This document reflects best practices as of 2025. Browser capabilities and specifications continue to evolve. Always test your implementation across target browsers and consult the latest specifications.
