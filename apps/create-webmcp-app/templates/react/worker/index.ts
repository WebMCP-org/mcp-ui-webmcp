import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { TemplateMCP } from './mcpServer';

export { TemplateMCP };

/**
 * Hono-based Cloudflare Worker
 *
 * Routes requests to MCP endpoints with CORS support.
 * Serves the built web app from dist/client/.
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

app.all('/sse/*', async (c) => {
  return await TemplateMCP.serveSSE('/sse').fetch(c.req.raw, c.env, c.executionCtx);
});

app.all('/sse', async (c) => {
  return await TemplateMCP.serveSSE('/sse').fetch(c.req.raw, c.env, c.executionCtx);
});

app.all('/mcp', async (c) => {
  return await TemplateMCP.serve('/mcp').fetch(c.req.raw, c.env, c.executionCtx);
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
