/**
 * Explainability Service
 * 
 * Orchestrates AI-powered explanations with full audit trail.
 * Provider-agnostic (can swap OpenAI, Anthropic, etc.).
 * 
 * Core principles:
 * - AI explains only (never computes facts)
 * - Always linked to immutable fact snapshot
 * - Full audit provenance (provider, model, prompt version)
 * - Guardrails: log before & after (no raw secrets)
 */

import { Injectable, Inject } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { TenantContext } from '../tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { LlmProvider } from './llm.provider';
import {
  ExplainAudience,
  ExplainVerbosity,
  ExplainResult,
  ExplainTradingReadinessInput,
} from './explainability.types';
import { computeExplanationHash } from './explanation-hash';
import { LlmGatewayService } from '../ai/gateway/llm.gateway.service';
import { 
  ExplainTradingReadinessOutputSchema, 
  ExplainEsgKpiOutputSchema,
  ExplainCovenantOutputSchema,
  ExplainPortfolioRiskOutputSchema
} from '../ai/schemas';

export const LLM_PROVIDER = 'LLM_PROVIDER';

@Injectable()
export class ExplainabilityService {
  constructor(
    private readonly audit: AuditService,
    private readonly tenantContext: TenantContext,
    private readonly prisma: PrismaService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    private readonly llmGateway: LlmGatewayService,
  ) {}

  /**
   * Generate AI explanation for trading readiness (with caching)
   * 
   * Cache key: tenantId + loanId + factHash + audience + verbosity + explainVersion + provider
   * 
   * @param params - Request parameters
   * @returns AI-generated explanation (from cache or freshly generated)
   */
  async explainTradingReadiness(params: {
    actorUserId?: string;
    loanId: string;
    factHash: string;
    tenantId: string;
    audience: string;
    verbosity: string;
    explainVersion?: number;
    input: ExplainTradingReadinessInput;
    correlationId?: string;
  }): Promise<ExplainResult> {
    const explainVersion = params.explainVersion ?? 1;
    // Note: provider will be determined by gateway based on policy
    // For cache key, we'll use 'gateway-v1' to distinguish from old provider-specific caches
    const provider = 'gateway-v1';
    const { facts, audience, verbosity } = params.input;

    // ---- Compute cache key hash (deterministic) ----
    const cacheKey = {
      tenantId: params.tenantId,
      loanId: params.loanId,
      factHash: params.factHash,
      audience: params.audience,
      verbosity: params.verbosity,
      explainVersion,
      provider,
    };

    const explanationHash = computeExplanationHash(cacheKey);

    // ---- 1) Cache lookup ----
    const cached = await this.prisma.tradingReadinessExplanation.findUnique({
      where: { explanationHash },
    });

    if (cached) {
      // Cache hit - return immediately
      await this.audit.record({
        tenantId: params.tenantId,
        type: 'TRADING_READINESS_EXPLAIN_CACHE_HIT',
        summary: 'Trading readiness explanation served from cache',
        evidenceRef: params.loanId,
        actor: params.actorUserId
          ? {
              type: 'USER',
              userId: params.actorUserId,
              roles: [],
            }
          : {
              type: 'SERVICE',
              clientId: 'explainability-service',
            },
        correlationId: params.correlationId,
        payload: {
          factHash: params.factHash,
          provider,
          explainVersion,
          audience: params.audience,
          verbosity: params.verbosity,
          explanationHash,
        },
      });

      return cached.result as ExplainResult;
    }

    // ---- 2) Cache miss - generate new explanation ----

    // Audit: requested
    await this.audit.record({
      tenantId: params.tenantId,
      type: 'TRADING_READINESS_EXPLAIN_REQUESTED',
      summary: 'Trading readiness explanation requested',
      evidenceRef: params.loanId,
      actor: params.actorUserId
        ? {
            type: 'USER',
            userId: params.actorUserId,
            roles: [],
          }
        : {
            type: 'SERVICE',
            clientId: 'explainability-service',
          },
      correlationId: params.correlationId,
      payload: {
        factHash: params.factHash,
        provider,
        explainVersion,
        audience: params.audience,
        verbosity: params.verbosity,
        explanationHash,
      },
    });

    // ---- 3) Generate explanation (AI call via Gateway - B6) ----
    const gatewayResult = await this.llmGateway.generateJson({
      templateId: 'EXPLAIN_TRADING_READINESS',
      templateVersion: 1,
      vars: params.input, // { facts, audience, verbosity }
      outputSchema: ExplainTradingReadinessOutputSchema,
      policy: {
        purpose: 'EXPLAINABILITY',
        module: 'TRADING',
        audience: params.audience,
        verbosity: params.verbosity as 'SHORT' | 'STANDARD' | 'DETAILED',
      },
      context: {
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        correlationId: params.correlationId,
        entityType: 'LOAN',
        entityId: params.loanId,
        factHash: params.factHash,
      },
    });

    const output = gatewayResult.json; // Validated by gateway

    // ---- 4) Persist to cache (immutable) ----
    await this.prisma.tradingReadinessExplanation.create({
      data: {
        tenantId: params.tenantId,
        loanId: params.loanId,
        factHash: params.factHash,
        audience: params.audience,
        verbosity: params.verbosity,
        explainVersion,
        provider: gatewayResult.provider, // Actual provider used (PRIMARY or FALLBACK)
        result: output as any,
        explanationHash,
        correlationId: params.correlationId,
      },
    });

    // ---- 5) Audit: generated ----
    await this.audit.record({
      tenantId: params.tenantId,
      type: 'TRADING_READINESS_EXPLAIN_GENERATED',
      summary: 'Trading readiness explanation generated',
      evidenceRef: params.loanId,
      actor: params.actorUserId
        ? {
            type: 'USER',
            userId: params.actorUserId,
            roles: [],
          }
        : {
            type: 'SERVICE',
            clientId: 'explainability-service',
          },
      correlationId: params.correlationId,
      payload: {
        factHash: params.factHash,
        provider: gatewayResult.provider,
        model: gatewayResult.model,
        explainVersion,
        audience: params.audience,
        verbosity: params.verbosity,
        explanationHash,
        confidence: output.confidence,
      },
    });

    return output;
  }

  /**
   * Generate cached explanation for ESG KPI assessment
   * 
   * Week 3 - Track A: ESG KPI Explainability
   */
  async explainEsgKpi(params: {
    actorUserId?: string;
    tenantId: string;
    loanId: string;
    kpiId: string;
    factHash: string;
    audience: string;
    verbosity: string;
    explainVersion?: number;
    input: unknown;
    correlationId?: string;
  }) {
    const explainVersion = params.explainVersion ?? 1;
    // Provider determined by gateway based on policy
    const provider = 'gateway-v1';

    const cacheKey = {
      tenantId: params.tenantId,
      loanId: params.loanId,
      kpiId: params.kpiId,
      factHash: params.factHash,
      audience: params.audience,
      verbosity: params.verbosity,
      explainVersion,
      provider,
    };

    const explanationHash = computeExplanationHash(cacheKey);

    const cached = await this.prisma.esgKpiExplanation.findUnique({
      where: { explanationHash },
    });

    if (cached) {
      await this.audit.record({
        tenantId: params.tenantId,
        type: 'EXPLAIN_KPI_CACHE_HIT',
        summary: 'ESG KPI explanation served from cache',
        evidenceRef: params.loanId,
        actor: params.actorUserId
          ? { type: 'USER', userId: params.actorUserId, roles: [] }
          : { type: 'SERVICE', clientId: 'explainability-service' },
        payload: {
          kpiId: params.kpiId,
          factHash: params.factHash,
          explanationHash,
          provider,
          explainVersion,
        },
        correlationId: params.correlationId,
      });
      return cached.result;
    }

    await this.audit.record({
      tenantId: params.tenantId,
      type: 'EXPLAIN_KPI_REQUESTED',
      summary: 'ESG KPI explanation requested',
      evidenceRef: params.loanId,
      actor: params.actorUserId
        ? { type: 'USER', userId: params.actorUserId, roles: [] }
        : { type: 'SERVICE', clientId: 'explainability-service' },
      payload: {
        kpiId: params.kpiId,
        factHash: params.factHash,
        explanationHash,
        provider,
        explainVersion,
      },
      correlationId: params.correlationId,
    });

    // ---- Generate explanation via Gateway (B6.2) ----
    const gatewayResult = await this.llmGateway.generateJson({
      templateId: 'EXPLAIN_ESG_KPI',
      templateVersion: 1,
      vars: params.input as any,
      outputSchema: ExplainEsgKpiOutputSchema,
      policy: {
        purpose: 'EXPLAINABILITY',
        module: 'ESG',
        audience: params.audience,
        verbosity: params.verbosity as 'SHORT' | 'STANDARD' | 'DETAILED',
      },
      context: {
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        correlationId: params.correlationId,
        entityType: 'LOAN',
        entityId: params.loanId,
        factHash: params.factHash,
      },
    });

    const output = gatewayResult.json;

    await this.prisma.esgKpiExplanation.create({
      data: {
        tenantId: params.tenantId,
        loanId: params.loanId,
        kpiId: params.kpiId,
        factHash: params.factHash,
        audience: params.audience,
        verbosity: params.verbosity,
        explainVersion,
        provider: gatewayResult.provider, // Actual provider used
        result: output as any,
        explanationHash,
        correlationId: params.correlationId,
      },
    });

    await this.audit.record({
      tenantId: params.tenantId,
      type: 'EXPLAIN_KPI_GENERATED',
      summary: 'ESG KPI explanation generated',
      evidenceRef: params.loanId,
      actor: params.actorUserId
        ? { type: 'USER', userId: params.actorUserId, roles: [] }
        : { type: 'SERVICE', clientId: 'explainability-service' },
      payload: {
        kpiId: params.kpiId,
        factHash: params.factHash,
        explanationHash,
        provider: gatewayResult.provider,
        model: gatewayResult.model,
        explainVersion,
      },
      correlationId: params.correlationId,
    });

    return output;
  }

  /**
   * Generate cached explanation for covenant breach
   * 
   * Week 3 - Track A: Covenant Breach Explainability
   * 
   * SAFETY: Explains evaluated logic only, NOT legal interpretation
   * 
   * Pattern: Same caching logic as trading readiness, different table
   */
  async explainCovenant(params: {
    actorUserId?: string;
    tenantId: string;
    loanId: string;
    covenantId: string;
    factHash: string;
    audience: string;
    verbosity: string;
    explainVersion?: number;
    input: unknown;
    correlationId?: string;
  }) {
    const explainVersion = params.explainVersion ?? 1;
    // Provider determined by gateway based on policy
    const provider = 'gateway-v1';

    // ---- 1) Compute cache key + hash ----
    const cacheKey = {
      tenantId: params.tenantId,
      loanId: params.loanId,
      covenantId: params.covenantId,
      factHash: params.factHash,
      audience: params.audience,
      verbosity: params.verbosity,
      explainVersion,
      provider,
    };

    const explanationHash = computeExplanationHash(cacheKey);

    // ---- 2) Check cache ----
    const cached = await this.prisma.covenantExplanation.findUnique({
      where: { explanationHash },
    });

    if (cached) {
      await this.audit.record({
        tenantId: params.tenantId,
        type: 'EXPLAIN_COVENANT_CACHE_HIT',
        summary: 'Covenant explanation served from cache',
        evidenceRef: params.loanId,
        actor: params.actorUserId
          ? { type: 'USER', userId: params.actorUserId, roles: [] }
          : { type: 'SERVICE', clientId: 'explainability-service' },
        payload: {
          covenantId: params.covenantId,
          factHash: params.factHash,
          explanationHash,
          provider,
          explainVersion,
        },
        correlationId: params.correlationId,
      });
      return cached.result;
    }

    // ---- 3) Audit: requested ----
    await this.audit.record({
      tenantId: params.tenantId,
      type: 'EXPLAIN_COVENANT_REQUESTED',
      summary: 'Covenant explanation requested',
      evidenceRef: params.loanId,
      actor: params.actorUserId
        ? { type: 'USER', userId: params.actorUserId, roles: [] }
        : { type: 'SERVICE', clientId: 'explainability-service' },
      payload: {
        covenantId: params.covenantId,
        factHash: params.factHash,
        explanationHash,
        provider,
        explainVersion,
      },
      correlationId: params.correlationId,
    });

    // ---- 4) Generate explanation via Gateway (B6.2) ----
    const gatewayResult = await this.llmGateway.generateJson({
      templateId: 'EXPLAIN_COVENANT',
      templateVersion: 1,
      vars: params.input as any,
      outputSchema: ExplainCovenantOutputSchema,
      policy: {
        purpose: 'EXPLAINABILITY',
        module: 'SERVICING',
        audience: params.audience,
        verbosity: params.verbosity as 'SHORT' | 'STANDARD' | 'DETAILED',
      },
      context: {
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        correlationId: params.correlationId,
        entityType: 'LOAN',
        entityId: params.loanId,
        factHash: params.factHash,
      },
    });

    const output = gatewayResult.json;

    // ---- 5) Persist to cache (immutable) ----
    await this.prisma.covenantExplanation.create({
      data: {
        tenantId: params.tenantId,
        loanId: params.loanId,
        covenantId: params.covenantId,
        factHash: params.factHash,
        audience: params.audience,
        verbosity: params.verbosity,
        explainVersion,
        provider: gatewayResult.provider, // Actual provider used
        result: output as any,
        explanationHash,
        correlationId: params.correlationId,
      },
    });

    // ---- 6) Audit: generated ----
    await this.audit.record({
      tenantId: params.tenantId,
      type: 'EXPLAIN_COVENANT_GENERATED',
      summary: 'Covenant explanation generated',
      evidenceRef: params.loanId,
      actor: params.actorUserId
        ? { type: 'USER', userId: params.actorUserId, roles: [] }
        : { type: 'SERVICE', clientId: 'explainability-service' },
      payload: {
        covenantId: params.covenantId,
        factHash: params.factHash,
        explanationHash,
        provider: gatewayResult.provider,
        model: gatewayResult.model,
        explainVersion,
      },
      correlationId: params.correlationId,
    });

    return output;
  }

  /**
   * Generate cached explanation for portfolio risk distribution
   * 
   * Week 3 - Track A: Portfolio-level Intelligence
   * 
   * Pattern: Same caching logic as other explainers, different table
   */
  async explainPortfolioRisk(params: {
    actorUserId?: string;
    tenantId: string;
    portfolioId: string | null;
    factHash: string;
    audience: string;
    verbosity: string;
    explainVersion?: number;
    input: unknown;
    correlationId?: string;
  }) {
    const explainVersion = params.explainVersion ?? 1;
    // Provider determined by gateway based on policy
    const provider = 'gateway-v1';

    // ---- 1) Compute cache key + hash ----
    const cacheKey = {
      tenantId: params.tenantId,
      portfolioId: params.portfolioId ?? 'default',
      factHash: params.factHash,
      audience: params.audience,
      verbosity: params.verbosity,
      explainVersion,
      provider,
    };

    const explanationHash = computeExplanationHash(cacheKey);

    // ---- 2) Check cache ----
    const cached = await this.prisma.portfolioRiskExplanation.findUnique({
      where: { explanationHash },
    });

    if (cached) {
      await this.audit.record({
        tenantId: params.tenantId,
        type: 'EXPLAIN_PORTFOLIO_RISK_CACHE_HIT',
        summary: 'Portfolio risk explanation served from cache',
        evidenceRef: params.portfolioId ?? 'default',
        actor: params.actorUserId
          ? { type: 'USER', userId: params.actorUserId, roles: [] }
          : { type: 'SERVICE', clientId: 'explainability-service' },
        payload: {
          portfolioId: params.portfolioId,
          factHash: params.factHash,
          explanationHash,
          provider,
          explainVersion,
        },
        correlationId: params.correlationId,
      });
      return cached.result;
    }

    // ---- 3) Audit: requested ----
    await this.audit.record({
      tenantId: params.tenantId,
      type: 'EXPLAIN_PORTFOLIO_RISK_REQUESTED',
      summary: 'Portfolio risk explanation requested',
      evidenceRef: params.portfolioId ?? 'default',
      actor: params.actorUserId
        ? { type: 'USER', userId: params.actorUserId, roles: [] }
        : { type: 'SERVICE', clientId: 'explainability-service' },
      payload: {
        portfolioId: params.portfolioId,
        factHash: params.factHash,
        explanationHash,
        provider,
        explainVersion,
      },
      correlationId: params.correlationId,
    });

    // ---- 4) Generate explanation via Gateway (B6.2) ----
    const gatewayResult = await this.llmGateway.generateJson({
      templateId: 'EXPLAIN_PORTFOLIO_RISK',
      templateVersion: 1,
      vars: params.input as any,
      outputSchema: ExplainPortfolioRiskOutputSchema,
      policy: {
        purpose: 'EXPLAINABILITY',
        module: 'PORTFOLIO',
        audience: params.audience,
        verbosity: params.verbosity as 'SHORT' | 'STANDARD' | 'DETAILED',
      },
      context: {
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        correlationId: params.correlationId,
        entityType: 'PORTFOLIO',
        entityId: params.portfolioId ?? 'default',
        factHash: params.factHash,
      },
    });

    const output = gatewayResult.json;

    // ---- 5) Persist to cache (immutable) ----
    await this.prisma.portfolioRiskExplanation.create({
      data: {
        tenantId: params.tenantId,
        portfolioId: params.portfolioId,
        factHash: params.factHash,
        audience: params.audience,
        verbosity: params.verbosity,
        explainVersion,
        provider: gatewayResult.provider, // Actual provider used
        result: output as any,
        explanationHash,
        correlationId: params.correlationId,
      },
    });

    // ---- 6) Audit: generated ----
    await this.audit.record({
      tenantId: params.tenantId,
      type: 'EXPLAIN_PORTFOLIO_RISK_GENERATED',
      summary: 'Portfolio risk explanation generated',
      evidenceRef: params.portfolioId ?? 'default',
      actor: params.actorUserId
        ? { type: 'USER', userId: params.actorUserId, roles: [] }
        : { type: 'SERVICE', clientId: 'explainability-service' },
      payload: {
        portfolioId: params.portfolioId,
        factHash: params.factHash,
        explanationHash,
        provider: gatewayResult.provider,
        model: gatewayResult.model,
        explainVersion,
      },
      correlationId: params.correlationId,
    });

    return output;
  }
}
