import { DurableObject } from 'cloudflare:workers';

/**
 * Usage quota tracking for anonymous users
 * Each device gets a fixed budget (e.g., $1.00) that never resets
 */

/**
 * Quota information for a device
 */
export interface QuotaStatus {
  /** Device ID */
  deviceId: string;
  /** Total cost consumed in USD */
  totalSpent: number;
  /** Maximum allowed spend in USD */
  quotaLimit: number;
  /** Remaining budget in USD */
  remaining: number;
  /** Whether the device has remaining quota */
  hasQuota: boolean;
  /** ISO timestamp of first usage */
  firstUsed: string;
  /** ISO timestamp of last usage */
  lastUsed: string;
}

/**
 * Anthropic API pricing (as of 2025)
 * Claude Haiku 4.5 pricing
 */
const PRICING = {
  INPUT_PER_TOKEN: 0.25 / 1_000_000,
  OUTPUT_PER_TOKEN: 1.25 / 1_000_000,
} as const;

/**
 * Default quota limit per device (in USD)
 */
const DEFAULT_QUOTA_LIMIT = 1.0;

/**
 * Durable Object for tracking per-device usage quotas
 * Each device ID gets a fixed budget that never automatically resets
 * Uses RPC methods for direct invocation from Workers
 */
export class UsageQuota extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  /**
   * Check if device has remaining quota before API call
   *
   * @param deviceId - Unique device identifier from crypto.randomUUID()
   * @returns Quota status with allowed flag and remaining budget
   *
   * @example
   * ```ts
   * const quotaStub = env.USAGE_QUOTA.get(env.USAGE_QUOTA.idFromName(deviceId));
   * const status = await quotaStub.checkQuota(deviceId);
   * if (!status.allowed) {
   *   return new Response('Quota exceeded', { status: 429 });
   * }
   * ```
   */
  async checkQuota(deviceId: string): Promise<{
    allowed: boolean;
    remaining: number;
    totalSpent: number;
    quotaLimit: number;
  }> {
    const status = await this.getOrInitializeQuota(deviceId);

    return {
      allowed: status.hasQuota,
      remaining: status.remaining,
      totalSpent: status.totalSpent,
      quotaLimit: status.quotaLimit,
    };
  }

  /**
   * Consume quota after successful API call
   *
   * Calculates cost from token usage based on Claude Haiku 4.5 pricing
   * and deducts from the device's budget. Call this in the onFinish callback
   * after the LLM response is complete.
   *
   * @param deviceId - Unique device identifier from crypto.randomUUID()
   * @param inputTokens - Number of input tokens consumed (from usage.inputTokens)
   * @param outputTokens - Number of output tokens consumed (from usage.outputTokens)
   * @returns Result with cost deducted and remaining budget
   *
   * @example
   * ```ts
   * onFinish: async (result) => {
   *   const consumeResult = await quotaStub.consumeQuota(
   *     deviceId,
   *     result.usage.inputTokens,
   *     result.usage.outputTokens
   *   );
   *   console.log(`Cost: $${consumeResult.cost}, Remaining: $${consumeResult.remaining}`);
   * }
   * ```
   */
  async consumeQuota(
    deviceId: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<{
    success: boolean;
    cost: number;
    remaining: number;
    totalSpent: number;
    hasQuota: boolean;
  }> {
    const cost = this.calculateCost(inputTokens, outputTokens);

    const quotaKey = `quota:${deviceId}`;
    let quota = await this.ctx.storage.get<QuotaStatus>(quotaKey);

    if (!quota) {
      quota = {
        deviceId,
        totalSpent: 0,
        quotaLimit: DEFAULT_QUOTA_LIMIT,
        remaining: DEFAULT_QUOTA_LIMIT,
        hasQuota: true,
        firstUsed: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      };
    }

    quota.totalSpent += cost;
    quota.remaining = Math.max(0, quota.quotaLimit - quota.totalSpent);
    quota.hasQuota = quota.remaining > 0;
    quota.lastUsed = new Date().toISOString();

    await this.ctx.storage.put(quotaKey, quota);

    return {
      success: true,
      cost,
      remaining: quota.remaining,
      totalSpent: quota.totalSpent,
      hasQuota: quota.hasQuota,
    };
  }

  /**
   * Get current quota status for a device
   *
   * Retrieves the full quota information including total spent,
   * remaining budget, and usage timestamps.
   *
   * @param deviceId - Unique device identifier from crypto.randomUUID()
   * @returns Complete quota status object
   *
   * @example
   * ```ts
   * const quotaStub = env.USAGE_QUOTA.get(env.USAGE_QUOTA.idFromName(deviceId));
   * const status = await quotaStub.getQuotaStatus(deviceId);
   * console.log(`Device has used $${status.totalSpent} of $${status.quotaLimit}`);
   * ```
   */
  async getQuotaStatus(deviceId: string): Promise<QuotaStatus> {
    return await this.getOrInitializeQuota(deviceId);
  }

  /**
   * Get quota from storage or initialize with defaults
   * Private helper method
   */
  private async getOrInitializeQuota(deviceId: string): Promise<QuotaStatus> {
    const quotaKey = `quota:${deviceId}`;
    let quota = await this.ctx.storage.get<QuotaStatus>(quotaKey);

    if (!quota) {
      quota = {
        deviceId,
        totalSpent: 0,
        quotaLimit: DEFAULT_QUOTA_LIMIT,
        remaining: DEFAULT_QUOTA_LIMIT,
        hasQuota: true,
        firstUsed: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      };
      await this.ctx.storage.put(quotaKey, quota);
    }

    return quota;
  }

  /**
   * Calculate cost from token usage
   * Private helper method
   * @param inputTokens Number of input tokens
   * @param outputTokens Number of output tokens
   * @returns Cost in USD
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = inputTokens * PRICING.INPUT_PER_TOKEN;
    const outputCost = outputTokens * PRICING.OUTPUT_PER_TOKEN;
    return inputCost + outputCost;
  }
}
