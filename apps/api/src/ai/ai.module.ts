/**
 * AI Module
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B5: Audit-Safe AI Calls
 * Step B10.2: AI Rate Limits
 * 
 * NestJS module that provides:
 * - LlmGatewayService (main entrypoint)
 * - LlmRouterService (provider selection)
 * - AiAuditService (comprehensive AI audit trails)
 * - AiRateLimiterService (B10.2: rate limiting)
 * - Primary + Fallback providers
 * 
 * Import this module to use AI capabilities with automatic fallback and auditing.
 */

import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RedisModule } from '../config/redis.module';
import { LlmGatewayService } from './gateway/llm.gateway.service';
import { DemoProvider } from './gateway/providers/demo.provider';
import { LlmRouterService } from './gateway/llm.router.service';
import { AiAuditService } from './audit/ai-audit.service';
import { AiRateLimiterService } from './ratelimit/ai-ratelimit.service';

/**
 * AI Module
 * 
 * Provides LlmGatewayService with automatic fallback and comprehensive auditing.
 * 
 * Current setup (B10.2):
 * - Primary: DemoProvider (never fails by default)
 * - Fallback: DemoProvider (different name)
 * - Router selects model based on policy
 * - AiAuditService records all AI calls
 * - AiRateLimiterService enforces per-tenant/actor/module limits
 * 
 * Audit events emitted:
 * - AI_CALL_REQUESTED: Before provider call
 * - AI_CALL_COMPLETED: After success (with tokens, cost, duration)
 * - AI_CALL_FAILED: On failure (with error details)
 * - AI_RATE_LIMIT_ALLOWED: Rate limit check passed (B10.2)
 * - AI_RATE_LIMIT_DENIED: Rate limit exceeded (B10.2)
 * 
 * Rate limiting (B10.2):
 * - Scoped by: tenantId + actorUserId + module + templateId
 * - Redis-backed (distributed across API instances)
 * - Conservative defaults per module
 * - Full audit trail for governance
 * 
 * Usage in other modules:
 * ```typescript
 * @Module({
 *   imports: [AiModule],
 *   // ...
 * })
 * export class ExplainabilityModule {}
 * ```
 */
@Module({
  imports: [
    AuditModule, // Provides AuditService for AI audit events
    RedisModule, // Provides Redis for rate limiting (B10.2)
  ],
  providers: [
    // Primary Provider: Never fails by default
    // Change to 0.3 to test fallback: new DemoProvider('DEMO_PRIMARY', 0.3)
    {
      provide: 'LlmProviderPrimary',
      useFactory: () => new DemoProvider('DEMO_PRIMARY', 0.0),
    },
    
    // Fallback Provider: Always available
    {
      provide: 'LlmProviderFallback',
      useFactory: () => new DemoProvider('DEMO_FALLBACK', 0.0),
    },

    // Router: Selects provider + model based on policy
    {
      provide: LlmRouterService,
      useFactory: (primary: any, fallback: any) => new LlmRouterService(primary, fallback),
      inject: ['LlmProviderPrimary', 'LlmProviderFallback'],
    },

    // Audit Service: Records all AI calls
    AiAuditService,

    // Rate Limiter: Enforces per-tenant/actor/module limits (B10.2)
    AiRateLimiterService,

    // Gateway: Uses router + audit + rate limiter for all AI calls
    LlmGatewayService,
  ],
  exports: [LlmGatewayService],
})
export class AiModule {}
