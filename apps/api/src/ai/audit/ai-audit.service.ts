/**
 * AI Audit Service
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B5: Audit-Safe AI Calls
 * 
 * Records structured audit events for all AI calls.
 * 
 * Events tracked:
 * - AI_CALL_REQUESTED: Before provider call
 * - AI_CALL_COMPLETED: After successful generation + validation
 * - AI_CALL_FAILED: On failure (permanent or after fallback exhausted)
 * 
 * Metadata includes:
 * - Template ID + version (reproducibility)
 * - Provider + model (for cost allocation)
 * - Prompt checksum (immutability verification)
 * - Duration + tokens + cost (performance + billing)
 * - Policy + context (business context)
 */

import { Injectable } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { AI_AUDIT_ACTIONS } from './ai-audit.actions';

/**
 * Base AI Audit Payload
 * 
 * Common metadata for all AI audit events.
 * 
 * B10.1: Added redaction metadata for PII safety compliance.
 */
type AiAuditBase = {
  templateId: string;
  templateVersion: number;
  provider: string;
  model: string;
  promptChecksum: string; // Checksum of REDACTED prompt (post-PII removal)
  durationMs?: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  costUsd?: number;

  // B10.1: Redaction metadata (proves PII was removed before LLM call)
  redactionApplied?: boolean;
  redactionSummary?: string[]; // e.g., ['emails', 'phone_numbers', 'long_tokens']

  policy: {
    purpose: string;
    module: string;
    audience: string;
    verbosity: string;
  };

  context: {
    tenantId: string;
    actorUserId?: string;
    correlationId?: string;
    entityType: string;
    entityId: string;
    factHash?: string;
  };
};

/**
 * AI Audit Service
 * 
 * Wraps the core AuditService to provide AI-specific audit events.
 * 
 * Benefits:
 * - Structured AI metadata (not free-form)
 * - Type-safe audit payloads
 * - Consistent event naming
 * - Easy to query for AI-specific analytics
 * 
 * Usage in Gateway:
 * ```typescript
 * await this.aiAudit.requested({ ... });
 * // ... AI call ...
 * await this.aiAudit.completed({ ..., success: true });
 * ```
 */
@Injectable()
export class AiAuditService {
  constructor(private readonly audit: AuditService) {}

  /**
   * Record AI call requested event
   * 
   * Emitted before calling the LLM provider.
   * Includes template, policy, and context.
   * 
   * Duration/usage/cost are undefined at this point.
   */
  async requested(payload: AiAuditBase) {
    await this.audit.record({
      tenantId: payload.context.tenantId,
      type: AI_AUDIT_ACTIONS.REQUESTED,
      summary: `AI call requested: ${payload.templateId}@v${payload.templateVersion} via ${payload.provider}`,
      evidenceRef: payload.context.entityId,
      actor: payload.context.actorUserId
        ? { type: 'USER', userId: payload.context.actorUserId, roles: [] }
        : { type: 'SERVICE', clientId: 'ai-gateway-service' },
      payload,
      correlationId: payload.context.correlationId,
    });
  }

  /**
   * Record AI call completed event
   * 
   * Emitted after successful generation + validation.
   * Includes duration, usage, and cost.
   * 
   * Used for:
   * - Cost tracking
   * - Performance monitoring
   * - Success rate analytics
   */
  async completed(payload: AiAuditBase & { success: true }) {
    await this.audit.record({
      tenantId: payload.context.tenantId,
      type: AI_AUDIT_ACTIONS.COMPLETED,
      summary: `AI call completed: ${payload.templateId}@v${payload.templateVersion} via ${payload.provider} (${payload.durationMs}ms, $${payload.costUsd?.toFixed(4) ?? '0'})`,
      evidenceRef: payload.context.entityId,
      actor: payload.context.actorUserId
        ? { type: 'USER', userId: payload.context.actorUserId, roles: [] }
        : { type: 'SERVICE', clientId: 'ai-gateway-service' },
      payload,
      correlationId: payload.context.correlationId,
    });
  }

  /**
   * Record AI call failed event
   * 
   * Emitted when AI call fails (permanent error or fallback exhausted).
   * Includes error type and message for debugging.
   * 
   * Used for:
   * - Error rate tracking
   * - Provider reliability monitoring
   * - Debugging failed AI calls
   */
  async failed(
    payload: AiAuditBase & {
      success: false;
      errorType: string;
      errorMessage: string;
    },
  ) {
    await this.audit.record({
      tenantId: payload.context.tenantId,
      type: AI_AUDIT_ACTIONS.FAILED,
      summary: `AI call failed: ${payload.templateId}@v${payload.templateVersion} via ${payload.provider} - ${payload.errorType}`,
      evidenceRef: payload.context.entityId,
      actor: payload.context.actorUserId
        ? { type: 'USER', userId: payload.context.actorUserId, roles: [] }
        : { type: 'SERVICE', clientId: 'ai-gateway-service' },
      payload,
      correlationId: payload.context.correlationId,
    });
  }
}
