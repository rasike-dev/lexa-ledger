/**
 * AI Rate Limiter Service
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B10.2: AI Rate Limits
 * 
 * Redis-backed rate limiter for AI calls.
 * 
 * Scope: tenantId + actorUserId + module + templateId
 * Algorithm: Token bucket (Redis INCR + EXPIRE)
 * 
 * Audit trail:
 * - AI_RATE_LIMIT_ALLOWED: Call permitted
 * - AI_RATE_LIMIT_DENIED: Call blocked (limit exceeded)
 */

import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { getAiRateLimit } from './ai-ratelimit.policy';
import { AiRateLimitExceededError } from './ai-ratelimit.errors';
import { LlmPolicy, LlmContext } from '../gateway/llm.gateway.types';
import { AuditService } from '../../audit/audit.service';

/**
 * AI Rate Limiter Service
 * 
 * Uses Redis for distributed rate limiting across API instances.
 * 
 * Key structure: `ai:rl:{tenantId}:{actorUserId}:{module}:{templateId}`
 * 
 * Algorithm:
 * 1. INCR key (atomic)
 * 2. If count == 1, set EXPIRE to windowSeconds
 * 3. If count > maxCalls, throw AiRateLimitExceededError
 * 4. Record audit event (ALLOWED or DENIED)
 * 
 * Benefits:
 * - Prevents abuse (DOS, cost attacks)
 * - Per-tenant isolation (one tenant can't exhaust quota for others)
 * - Per-actor fairness (one user can't block others in same tenant)
 * - Per-module granularity (different limits for different use-cases)
 * - Full audit trail (compliance)
 */
@Injectable()
export class AiRateLimiterService {
  constructor(
    @Inject('REDIS') private readonly redis: Redis,
    private readonly audit: AuditService,
  ) {}

  /**
   * Build rate limit key
   * 
   * Format: `ai:rl:{tenantId}:{actor}:{module}:{templateId}`
   * 
   * Examples:
   * - `ai:rl:tenant1:user123:TRADING:EXPLAIN_TRADING_READINESS`
   * - `ai:rl:tenant1:SERVICE:PORTFOLIO:EXPLAIN_PORTFOLIO_RISK`
   * 
   * Key includes templateId for fine-grained control:
   * - Different templates can have different limits
   * - Prevents one template from exhausting quota for others
   */
  private buildKey(params: {
    tenantId: string;
    actorUserId?: string;
    module: string;
    templateId: string;
  }): string {
    const actor = params.actorUserId ?? 'SERVICE';
    return `ai:rl:${params.tenantId}:${actor}:${params.module}:${params.templateId}`;
  }

  /**
   * Check rate limit and throw if exceeded
   * 
   * Algorithm:
   * 1. Get limit policy for module
   * 2. Build rate limit key
   * 3. Atomic INCR + conditional EXPIRE
   * 4. Check count vs limit
   * 5. Record audit event
   * 6. Throw if exceeded, otherwise return
   * 
   * @param args - Template ID, policy, context
   * @throws AiRateLimitExceededError if limit exceeded
   */
  async checkOrThrow(args: {
    templateId: string;
    policy: LlmPolicy;
    context: LlmContext;
  }): Promise<void> {
    const { templateId, policy, context } = args;
    const limit = getAiRateLimit(policy);

    const key = this.buildKey({
      tenantId: context.tenantId,
      actorUserId: context.actorUserId,
      module: policy.module,
      templateId,
    });

    // Atomic: INCR + set expiry on first increment
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, limit.windowSeconds);
    }

    // Get TTL for retry-after hint
    const ttl = await this.redis.ttl(key);
    const retryAfterSeconds = ttl > 0 ? ttl : limit.windowSeconds;

    // Check if limit exceeded
    if (count > limit.maxCalls) {
      // Record DENIED event
      await this.audit.record({
        tenantId: context.tenantId,
        type: 'AI_RATE_LIMIT_DENIED',
        summary: `AI rate limit exceeded: ${policy.module} (${count}/${limit.maxCalls} in ${limit.windowSeconds}s)`,
        evidenceRef: context.entityId,
        actor: context.actorUserId
          ? { type: 'USER', userId: context.actorUserId, roles: [] }
          : { type: 'SERVICE', clientId: 'ai-gateway-service' },
        correlationId: context.correlationId,
        payload: {
          key,
          count,
          limit,
          templateId,
          module: policy.module,
          retryAfterSeconds,
        },
      });

      // Throw error with retry hint
      throw new AiRateLimitExceededError(
        `AI rate limit exceeded for ${policy.module}. Try again in ${retryAfterSeconds}s.`,
        retryAfterSeconds,
        key,
      );
    }

    // Record ALLOWED event
    await this.audit.record({
      tenantId: context.tenantId,
      type: 'AI_RATE_LIMIT_ALLOWED',
      summary: `AI rate limit check passed: ${policy.module} (${count}/${limit.maxCalls})`,
      evidenceRef: context.entityId,
      actor: context.actorUserId
        ? { type: 'USER', userId: context.actorUserId, roles: [] }
        : { type: 'SERVICE', clientId: 'ai-gateway-service' },
      correlationId: context.correlationId,
      payload: {
        key,
        count,
        limit,
        templateId,
        module: policy.module,
      },
    });
  }
}
