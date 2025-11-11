import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { GameStatsStorage } from './gameStatsStorage';
import { MyMCP } from './mcpServer';

export { MyMCP, GameStatsStorage };

/**
 * Allowed origins for CORS
 * In production, restrict this to your actual domains
 */
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8888',
  'https://chat.webmcp.org', // Add your production domains here
];

/**
 * Get CORS headers with origin validation
 * Falls back to permissive '*' in development if origin not in allowlist
 */
const getCorsHeaders = (requestOrigin: string | null, isDevelopment: boolean = true) => {
  if (!isDevelopment) {
    const isAllowed = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin);
    const allowedOrigin = isAllowed ? requestOrigin : ALLOWED_ORIGINS[0];

    return {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Headers': 'Content-Type, X-Anthropic-API-Key',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    };
  }

  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Anthropic-API-Key, *',
    'Access-Control-Allow-Methods': '*',
  };
};

/**
 * Get security headers including CSP
 */
const getSecurityHeaders = (isDevelopment: boolean = true) => {
  const headers: Record<string, string> = {
    'X-Frame-Options': 'ALLOWALL',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };

  if (!isDevelopment) {
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.anthropic.com",
      "frame-ancestors 'self' http://localhost:5173 https://chat.webmcp.org",
    ].join('; ');
  } else {
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' http://localhost:* ws://localhost:* https://api.anthropic.com",
      "frame-ancestors 'self' http://localhost:*",
    ].join('; ');
  }

  return headers;
};

/**
 * Hono-based Cloudflare Worker
 * Routes requests to the appropriate MCP endpoints with CORS and security headers
 */
const app = new Hono<{ Bindings: Env }>();

app.use(
  '/*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'X-Anthropic-API-Key', '*'],
    allowMethods: ['*'],
  })
);

app.use('/*', async (c, next) => {
  const isDevelopment = c.env?.ENVIRONMENT !== 'production';
  const securityHeaders = getSecurityHeaders(isDevelopment);

  await next();

  Object.entries(securityHeaders).forEach(([key, value]) => {
    c.res.headers.set(key, value);
  });
});

app.all('/sse/*', async (c) => {
  return await MyMCP.serveSSE('/sse').fetch(c.req.raw, c.env, c.executionCtx);
});

app.all('/sse', async (c) => {
  return await MyMCP.serveSSE('/sse').fetch(c.req.raw, c.env, c.executionCtx);
});

app.all('/mcp', async (c) => {
  return await MyMCP.serve('/mcp').fetch(c.req.raw, c.env, c.executionCtx);
});

app.get('/api/stats', async (c) => {
  try {
    const id = c.env.GAME_STATS.idFromName('global-stats');
    const stub = c.env.GAME_STATS.get(id);
    const response = await stub.fetch(new Request('http://internal/stats'));
    return response;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

app.get('/api/stats/ws', async (c) => {
  try {
    const upgradeHeader = c.req.header('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return c.json(
        { error: 'Expected WebSocket upgrade request' },
        { status: 426, statusText: 'Upgrade Required' }
      );
    }

    const id = c.env.GAME_STATS.idFromName('global-stats');
    const stub = c.env.GAME_STATS.get(id);

    return await stub.fetch(c.req.raw);
  } catch (error) {
    console.error('Error upgrading WebSocket:', error);
    return c.json({ error: 'Failed to establish WebSocket connection' }, 500);
  }
});

app.post('/api/stats/game-complete', async (c) => {
  try {
    const body = await c.req.json();
    const id = c.env.GAME_STATS.idFromName('global-stats');
    const stub = c.env.GAME_STATS.get(id);
    const response = await stub.fetch(
      new Request('http://internal/game-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    );
    return response;
  } catch (error) {
    console.error('Error recording game completion:', error);
    return c.json({ error: 'Failed to record game completion' }, 500);
  }
});

app.notFound((c) => {
  return c.json({ error: 'Not found', path: c.req.path }, 404);
});

app.onError((error, c) => {
  console.error('Worker error:', error);
  return c.json(
    {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    },
    500
  );
});

export default app;
