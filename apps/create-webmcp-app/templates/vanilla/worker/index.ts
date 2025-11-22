import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { VanillaTemplateMCP } from './mcpServer';

export { VanillaTemplateMCP };

/**
 * Hono-based Cloudflare Worker
 *
 * Routes requests to MCP endpoints with CORS support.
 * Serves the static HTML file from public/.
 */
const app = new Hono<{ Bindings: Env }>();

// Apply CORS middleware to all routes
// Super lax CORS policy for maximum embedding compatibility
app.use(
  '/*',
  cors({
    origin: '*',
    allowHeaders: ['*'],
    allowMethods: ['*'],
    exposeHeaders: ['*'],
    credentials: true,
    maxAge: 86400,
  })
);

// Route SSE (Server-Sent Events) endpoints
app.all('/sse/*', async (c) => {
  return await VanillaTemplateMCP.serveSSE('/sse').fetch(c.req.raw, c.env, c.executionCtx);
});

app.all('/sse', async (c) => {
  return await VanillaTemplateMCP.serveSSE('/sse').fetch(c.req.raw, c.env, c.executionCtx);
});

// Route MCP protocol endpoint
app.all('/mcp', async (c) => {
  return await VanillaTemplateMCP.serve('/mcp').fetch(c.req.raw, c.env, c.executionCtx);
});

// 404 handler for unmatched routes
app.notFound((c) => {
  return c.json({ error: 'Not found', path: c.req.path }, 404);
});

// Error handler
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
