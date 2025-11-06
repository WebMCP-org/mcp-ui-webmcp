import { createAnthropic } from '@ai-sdk/anthropic';
import { frontendTools } from '@assistant-ui/react-ai-sdk';
import * as Sentry from '@sentry/cloudflare';
import type { UIMessage } from 'ai';
import { convertToModelMessages, streamText } from 'ai';
import { cors } from 'hono/cors';
import { Hono } from 'hono/tiny';
import type { UsageQuota } from './usageQuota';

const app = new Hono<{ Bindings: Env }>();

app.use(
  '/*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'X-Anthropic-API-Key', 'X-Device-ID', 'sentry-trace', 'baggage', '*'],
    allowMethods: ['*'],
    exposeHeaders: ['*'],
  })
);

app.post('/api/chat', async (c) => {
  try {
    let apiKey = c.req.header('X-Anthropic-API-Key');

    if (!apiKey) {
      apiKey = c.env?.ANTHROPIC_API_KEY;
    }

    if (!apiKey) {
      return c.json({ error: 'Anthropic API key is required' }, 401);
    }

    const usingOwnApiKey = c.req.header('X-Anthropic-API-Key') !== undefined;

    let quotaStub: DurableObjectStub<UsageQuota> | null = null;
    let deviceId: string | null = null;
    if (!usingOwnApiKey) {
      deviceId = c.req.header('X-Device-ID') || null;
      if (!deviceId) {
        return c.json({ error: 'Device ID required when using default API key' }, 400);
      }

      const quotaId = c.env.USAGE_QUOTA.idFromName(deviceId);
      quotaStub = c.env.USAGE_QUOTA.get(quotaId);

      const quotaCheck = await quotaStub.checkQuota(deviceId);

      if (!quotaCheck.allowed) {
        return c.json(
          {
            error: 'Usage quota exceeded',
            message: `You have used your full quota of $${quotaCheck.quotaLimit.toFixed(2)}. Quota does not reset automatically.`,
            totalSpent: quotaCheck.totalSpent,
            quotaLimit: quotaCheck.quotaLimit,
          },
          429
        );
      }
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
      onFinish: async (result) => {
        if (quotaStub && deviceId) {
          const usage = result.usage;
          if (usage) {
            try {
              const inputTokens = usage.inputTokens ?? 0;
              const outputTokens = usage.outputTokens ?? 0;

              const consumeResult = await quotaStub.consumeQuota(deviceId, inputTokens, outputTokens);

              console.log(
                `Quota consumed for device ${deviceId}: $${consumeResult.cost.toFixed(6)} ` +
                `(${inputTokens} input + ${outputTokens} output tokens). ` +
                `Remaining: $${consumeResult.remaining.toFixed(2)}`
              );
            } catch (error) {
              console.error('Failed to consume quota:', error);
              Sentry.captureException(error);
            }
          }
        }
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

export { UsageQuota } from './usageQuota';

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
