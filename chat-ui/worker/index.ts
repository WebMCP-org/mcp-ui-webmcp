import { createAnthropic } from '@ai-sdk/anthropic';
import { frontendTools } from '@assistant-ui/react-ai-sdk';
import * as Sentry from '@sentry/cloudflare';
import type { UIMessage } from 'ai';
import { convertToModelMessages, streamText } from 'ai';
import { cors } from 'hono/cors';
import { Hono } from 'hono/tiny';

const app = new Hono<{ Bindings: Env }>();

app.use(
  '/*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'X-Anthropic-API-Key', 'sentry-trace', 'baggage', '*'],
    allowMethods: ['*'],
    exposeHeaders: ['*'],
  })
);

app.post('/api/chat', async (c) => {
  try {
    const apiKey = c.req.header('X-Anthropic-API-Key') || c.env?.ANTHROPIC_API_KEY;
    console.log('Using Anthropic API Key:', apiKey ? 'Provided' : 'Missing');

    if (!apiKey) {
      return c.json({ error: 'Anthropic API key is required' }, 401);
    }

    const anthropic = createAnthropic({
      apiKey,
    });

    const body = (await c.req.json()) as { messages: UIMessage[] };

    const result = streamText({
      model: anthropic('claude-haiku-4-5'),
      messages: convertToModelMessages(body.messages),
      // @ts-expect-error tools typing issue
      tools: {
        // @ts-expect-error tools typing issue
        ...frontendTools(body.tools),
      },
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'chat-api-endpoint',
        recordInputs: true,
        recordOutputs: true,
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error in /api/chat:', error);

    Sentry.captureException(error);

    return c.json(
      {
        error: 'Failed to process chat request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default Sentry.withSentry((env) => {
  const workerEnv = env as Env | undefined;
  return {
    dsn:
      workerEnv?.SENTRY_DSN ||
      'https://d7ac48e8b2390c1569059b7b184896f5@o4510053563891712.ingest.us.sentry.io/4510304218972160',
    environment: workerEnv?.ENVIRONMENT || 'production',
    tracesSampleRate: workerEnv?.ENVIRONMENT === 'development' ? 1.0 : 0.2,
    enableLogs: true,
    sendDefaultPii: true,
    integrations: [Sentry.vercelAIIntegration()],
  };
}, app);
