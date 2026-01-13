/**
 * LLM Gateway Service
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B5: Audit-Safe AI Calls
 * 
 * Core orchestration service for all AI calls with comprehensive auditing.
 * 
 * Pipeline:
 * 1. Render prompt (B1)
 * 2. Redact PII (B3 stub)
 * 3. Compute checksum
 * 4. Route to provider + model (B4)
 * 5. Emit REQUESTED audit event (B5) ✨
 * 6. Call primary provider
 * 7. If transient error → retry with fallback (B4)
 * 8. Validate output (B2)
 * 9. Emit COMPLETED or FAILED audit event (B5) ✨
 * 10. Return typed result + metadata
 */

import { Injectable } from '@nestjs/common';
import { renderPrompt } from '../prompts';
import { validateAiJson } from '../schemas';
import { redactPrompt } from './redaction';
import { sha256 } from './checksum';
import { GenerateJsonRequest, GenerateJsonResult } from './llm.gateway.types';
import { LlmRouterService } from './llm.router.service';
import { LlmTransientError } from './errors';
import { AiAuditService } from '../audit/ai-audit.service';
import { AiRateLimiterService } from '../ratelimit/ai-ratelimit.service';
import { estimateCostUsd } from './cost';

/**
 * LLM Gateway Service
 * 
 * Orchestrates the complete AI call pipeline with comprehensive auditing.
 * 
 * New in B5:
 * - Emits AI_CALL_REQUESTED before provider call
 * - Emits AI_CALL_COMPLETED on success (with tokens, cost, duration)
 * - Emits AI_CALL_FAILED on failure (with error details)
 * - Tracks which provider succeeded (primary vs fallback)
 * - Estimates cost based on model + usage
 * 
 * New in B10.2:
 * - Enforces AI rate limits (per tenant + actor + module + template)
 * - Emits AI_RATE_LIMIT_ALLOWED / AI_RATE_LIMIT_DENIED
 * - Throws AiRateLimitExceededError if limit exceeded
 */
@Injectable()
export class LlmGatewayService {
  constructor(
    private readonly router: LlmRouterService,
    private readonly aiAudit: AiAuditService,
    private readonly aiRateLimiter: AiRateLimiterService, // B10.2: Rate limiting
  ) {}

  /**
   * Generate JSON from a template using AI
   * 
   * B5 enhancements:
   * - Records audit events for compliance
   * - Tracks costs for billing
   * - Monitors performance (duration, success rate)
   * - Links to fact snapshots (via factHash)
   * 
   * Audit events:
   * 1. REQUESTED: Before provider call (duration/cost unknown)
   * 2. COMPLETED: After success (includes all metadata)
   * 3. FAILED: On error (includes error type/message)
   */
  async generateJson<TOut>(req: GenerateJsonRequest<TOut>): Promise<GenerateJsonResult<TOut>> {
    const start = Date.now();

    // 1) Render template from registry (B1)
    const { rendered } = renderPrompt({
      id: req.templateId,
      version: req.templateVersion,
      vars: req.vars,
    });

    // 2) Redact PII from prompt (B10.1: Real redaction)
    const redaction = redactPrompt(rendered);

    // 3) Compute checksum on the REDACTED prompt (ensures PII-free checksums)
    const promptChecksum = sha256(redaction.redactedPrompt);

    // 4) Check rate limit (B10.2: Enforce per-tenant/actor/module limits)
    //    Throws AiRateLimitExceededError if exceeded
    await this.aiRateLimiter.checkOrThrow({
      templateId: req.templateId,
      policy: req.policy,
      context: req.context,
    });

    // 5) Route to primary and fallback providers + models (B4)
    const routed = this.router.route(req.policy);

    // 6) Audit: AI call requested (B5)
    //    Duration/usage/cost unknown at this point
    //    B10.1: Include redaction metadata for compliance
    //    B10.2: Rate limit already checked (if we reach here, it passed)
    await this.aiAudit.requested({
      templateId: req.templateId,
      templateVersion: req.templateVersion,
      provider: routed.primary.provider.name(),
      model: routed.primary.model,
      promptChecksum,
      redactionApplied: redaction.redactionApplied, // B10.1: PII safety proof
      redactionSummary: redaction.redactionSummary, // B10.1: What was redacted
      policy: req.policy,
      context: req.context,
      usage: undefined,
      durationMs: undefined,
      costUsd: undefined,
    });

    try {
      // 6) Try primary provider first
      const resp = await routed.primary.provider.generateJson({
        prompt: redaction.redactedPrompt,
        model: routed.primary.model,
      });

      // 7) Validate output against Zod schema (B2)
      const json = validateAiJson(req.outputSchema, resp.json, {
        templateId: req.templateId,
        templateVersion: req.templateVersion,
      });

      // 8) Compute metrics
      const durationMs = Date.now() - start;
      const costUsd = estimateCostUsd(resp.model, resp.usage);

      // 9) Audit: AI call completed successfully (B5)
      //    B10.1: Include redaction metadata for compliance proof
      await this.aiAudit.completed({
        templateId: req.templateId,
        templateVersion: req.templateVersion,
        provider: routed.primary.provider.name(),
        model: resp.model,
        promptChecksum,
        redactionApplied: redaction.redactionApplied, // B10.1: PII safety proof
        redactionSummary: redaction.redactionSummary, // B10.1: What was redacted
        durationMs,
        usage: resp.usage,
        costUsd,
        policy: req.policy,
        context: req.context,
        success: true,
      });

      // 10) Return result with primary provider metadata
      return {
        json,
        provider: routed.primary.provider.name(),
        model: resp.model,
        promptChecksum,
        durationMs,
        usage: resp.usage,
      };
    } catch (err: any) {
      // 11) Handle transient errors with fallback (B4)
      if (err instanceof LlmTransientError) {
        try {
          // 12) Retry with fallback provider
          const resp = await routed.fallback.provider.generateJson({
            prompt: redaction.redactedPrompt,
            model: routed.fallback.model,
          });

          // 13) Validate fallback output
          const json = validateAiJson(req.outputSchema, resp.json, {
            templateId: req.templateId,
            templateVersion: req.templateVersion,
          });

          // 14) Compute metrics
          const durationMs = Date.now() - start;
          const costUsd = estimateCostUsd(resp.model, resp.usage);

          // 15) Audit: AI call completed via fallback (B5)
          //     B10.1: Include redaction metadata
          await this.aiAudit.completed({
            templateId: req.templateId,
            templateVersion: req.templateVersion,
            provider: routed.fallback.provider.name(),
            model: resp.model,
            promptChecksum,
            redactionApplied: redaction.redactionApplied, // B10.1
            redactionSummary: redaction.redactionSummary, // B10.1
            durationMs,
            usage: resp.usage,
            costUsd,
            policy: req.policy,
            context: req.context,
            success: true,
          });

          // 16) Return result with fallback provider metadata
          return {
            json,
            provider: routed.fallback.provider.name(),
            model: resp.model,
            promptChecksum,
            durationMs,
            usage: resp.usage,
          };
        } catch (fallbackErr: any) {
          // 17) Both providers failed - record failure (B5)
          //     B10.1: Include redaction metadata
          const durationMs = Date.now() - start;
          await this.aiAudit.failed({
            templateId: req.templateId,
            templateVersion: req.templateVersion,
            provider: routed.fallback.provider.name(),
            model: routed.fallback.model,
            promptChecksum,
            redactionApplied: redaction.redactionApplied, // B10.1
            redactionSummary: redaction.redactionSummary, // B10.1
            durationMs,
            policy: req.policy,
            context: req.context,
            usage: undefined,
            costUsd: undefined,
            success: false,
            errorType: fallbackErr?.name ?? 'Error',
            errorMessage: fallbackErr?.message ?? String(fallbackErr),
          });
          throw fallbackErr;
        }
      }

      // 18) Permanent error (don't retry) - record failure (B5)
      //     B10.1: Include redaction metadata
      const durationMs = Date.now() - start;
      await this.aiAudit.failed({
        templateId: req.templateId,
        templateVersion: req.templateVersion,
        provider: routed.primary.provider.name(),
        model: routed.primary.model,
        promptChecksum,
        redactionApplied: redaction.redactionApplied, // B10.1
        redactionSummary: redaction.redactionSummary, // B10.1
        durationMs,
        policy: req.policy,
        context: req.context,
        usage: undefined,
        costUsd: undefined,
        success: false,
        errorType: err?.name ?? 'Error',
        errorMessage: err?.message ?? String(err),
      });

      throw err;
    }
  }
}
