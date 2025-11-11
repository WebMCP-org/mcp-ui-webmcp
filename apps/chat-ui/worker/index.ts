import { createAnthropic } from '@ai-sdk/anthropic';
import { frontendTools } from '@assistant-ui/react-ai-sdk';
import * as Sentry from '@sentry/cloudflare';
import type { UIMessage } from 'ai';
import { convertToModelMessages, streamText } from 'ai';
import { cors } from 'hono/cors';
import { Hono } from 'hono/tiny';
import type { UsageQuota } from './usageQuota';

const app = new Hono<{ Bindings: Env }>();

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
      'Access-Control-Allow-Headers': 'Content-Type, X-Anthropic-API-Key, X-Device-ID, X-Playground-Source, sentry-trace, baggage',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Expose-Headers': 'Content-Type, X-Request-Id',
    };
  }

  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Anthropic-API-Key, X-Device-ID, X-Playground-Source, sentry-trace, baggage, *',
    'Access-Control-Allow-Methods': '*',
    'Access-Control-Expose-Headers': '*',
  };
};

/**
 * Get security headers including CSP
 */
const getSecurityHeaders = (isDevelopment: boolean = true) => {
  const headers: Record<string, string> = {
    'X-Frame-Options': 'SAMEORIGIN',
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
      "frame-src 'self' http://localhost:8888",
      "frame-ancestors 'self'",
    ].join('; ');
  } else {
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' http://localhost:* ws://localhost:* https://api.anthropic.com",
      "frame-src 'self' http://localhost:*",
    ].join('; ');
  }

  return headers;
};

// Apply CORS middleware
app.use(
  '/*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'X-Anthropic-API-Key', 'X-Device-ID', 'X-Playground-Source', 'sentry-trace', 'baggage', '*'],
    allowMethods: ['*'],
    exposeHeaders: ['*'],
  })
);

app.options('/api/chat', (c) => {
  const origin = c.req.header('Origin');
  const isDevelopment = c.env?.ENVIRONMENT !== 'production';
  return new Response(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(origin, isDevelopment),
      ...getSecurityHeaders(isDevelopment),
    },
  });
});

app.post('/api/chat', async (c) => {
  const origin = c.req.header('Origin');
  const isDevelopment = c.env?.ENVIRONMENT !== 'production';

  const corsHeaders = getCorsHeaders(origin, isDevelopment);
  const securityHeaders = getSecurityHeaders(isDevelopment);
  const allHeaders = { ...corsHeaders, ...securityHeaders };

  try {
    const isPlaygroundRequest = c.req.header('X-Playground-Source') === 'mcp-b-playground';

    let apiKey: string | undefined;
    if (isPlaygroundRequest) {
      apiKey = c.env?.ANTHROPIC_API_KEY;
    } else {
      apiKey = c.req.header('X-Anthropic-API-Key');
      if (!apiKey) {
        apiKey = c.env?.ANTHROPIC_API_KEY;
      }
    }

    if (!apiKey) {
      return c.json({ error: 'Anthropic API key is required' }, 401, allHeaders);
    }

    const usingOwnApiKey = !isPlaygroundRequest && c.req.header('X-Anthropic-API-Key') !== undefined;

    let quotaStub: DurableObjectStub<UsageQuota> | null = null;
    let deviceId: string | null = null;
    if (!usingOwnApiKey && !isPlaygroundRequest) {
      deviceId = c.req.header('X-Device-ID') || null;
      if (!deviceId) {
        return c.json({ error: 'Device ID required when using default API key' }, 400, allHeaders);
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
          429,
          allHeaders
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

    const streamResponse = result.toUIMessageStreamResponse();
    Object.entries(allHeaders).forEach(([key, value]) => {
      streamResponse.headers.set(key, value);
    });
    return streamResponse;
  } catch (error) {
    console.error('Error in /api/chat:', error);

    Sentry.captureException(error);

    return c.json(
      {
        error: 'Failed to process chat request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
      allHeaders
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
