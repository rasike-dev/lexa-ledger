/**
 * Trading Readiness Facts Controller
 * 
 * REST API for fact snapshots + AI explanations.
 * Spec-compliant paths: /api/trading/readiness/:loanId/*
 */

import { Controller, Get, Param, Post, Query, Req, Body, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { TradingReadinessFactsService } from './trading-readiness-facts.service';
import { ExplainabilityService } from '../explainability/explainability.service';
import { Roles } from '../auth/roles.decorator';
import { ExplainReadinessRequestSchema } from './dto/explain-readiness.dto';
import { deriveAudience } from './explain-audience';
import { AiJobsProducer } from '../ai/jobs/ai-jobs.producer';

@Controller('trading/readiness')
export class TradingReadinessFactsController {
  constructor(
    private readonly facts: TradingReadinessFactsService,
    private readonly explainability: ExplainabilityService,
    private readonly aiJobs: AiJobsProducer, // B7: Async explanation jobs
  ) {}

  /**
   * GET /api/trading/readiness/:loanId/facts/latest
   * 
   * Get latest fact snapshot for a loan.
   * Anyone with trading access can view.
   */
  @Get(':loanId/facts/latest')
  @Roles('TRADING_ANALYST', 'TRADING_VIEWER', 'TENANT_ADMIN', 'COMPLIANCE_AUDITOR')
  async latest(@Param('loanId') loanId: string) {
    return this.facts.latestForLoan(loanId);
  }

  /**
   * GET /api/trading/readiness/:loanId/facts
   * 
   * List fact snapshots for a loan (paginated).
   * Anyone with trading access can view.
   */
  @Get(':loanId/facts')
  @Roles('TRADING_ANALYST', 'TRADING_VIEWER', 'TENANT_ADMIN', 'COMPLIANCE_AUDITOR')
  async list(
    @Param('loanId') loanId: string,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.facts.listForLoan(loanId, take ? Number(take) : 10, cursor);
  }

  /**
   * POST /api/trading/readiness/:loanId/facts/recompute
   * 
   * Recompute and persist fact snapshot.
   * Restricted to analysts and admins.
   * 
   * B8: Now with drift detection - only enqueues explanation job if facts changed
   */
  @Post(':loanId/facts/recompute')
  @Roles('TRADING_ANALYST', 'TENANT_ADMIN')
  async recompute(@Param('loanId') loanId: string, @Req() req: Request) {
    const correlationId = (req as any).correlationId;
    const user = (req as any).user;
    
    const { snapshot, drifted } = await this.facts.computeAndPersistForLoan(loanId, correlationId);

    // B8: Only enqueue explanation job if facts changed (drift detected)
    // This saves AI costs and avoids regenerating identical explanations
    if (drifted) {
      await this.aiJobs.enqueueTradingExplainRecompute({
        tenantId: snapshot.tenantId,
        loanId,
        factHash: snapshot.factHash,
        audience: 'TRADING_ANALYST', // Default audience for auto-generated explanations
        verbosity: 'STANDARD',        // Default verbosity
        actorUserId: user?.userId,
        correlationId,
      });
    }

    return { snapshot, drifted };
  }

  /**
   * GET /api/trading/readiness/:loanId/explain/latest
   * 
   * Retrieve latest cached explanation (without regenerating).
   * Returns staleness indicator if facts have changed.
   * 
   * B9: Staleness detection for drift-aware UI
   */
  @Get(':loanId/explain/latest')
  @Roles('TRADING_ANALYST', 'TRADING_VIEWER', 'TENANT_ADMIN', 'COMPLIANCE_AUDITOR')
  async getLatestExplanation(
    @Param('loanId') loanId: string,
    @Req() req: Request,
    @Query('audience') audienceParam?: string,
    @Query('verbosity') verbosityParam?: string,
  ) {
    const user = (req as any).user;
    
    // Derive audience from user roles or query param
    const roles = user?.roles ?? [];
    const audience = audienceParam || deriveAudience(roles);
    const verbosity = verbosityParam || 'STANDARD';

    // Get latest fact snapshot
    const latestFacts = await this.facts.latestForLoan(loanId);
    if (!latestFacts) {
      throw new BadRequestException(
        `No trading readiness fact snapshot found for loanId=${loanId}. Recompute facts first.`,
      );
    }

    // Get latest cached explanation for this audience + verbosity (may be for old factHash)
    const tenantId = latestFacts.tenantId;
    const latestExplanation = await (this.explainability as any).prisma.tradingReadinessExplanation.findFirst({
      where: { tenantId, loanId, audience, verbosity },
      orderBy: { generatedAt: 'desc' },
    });

    // B9: Detect staleness (explanation factHash ≠ latest fact factHash)
    const isStale =
      latestExplanation?.factHash &&
      latestFacts?.factHash &&
      latestExplanation.factHash !== latestFacts.factHash;

    if (!latestExplanation) {
      return {
        exists: false,
        isStale: null,
        latestFactHash: latestFacts.factHash,
        message: 'No explanation generated yet. Call POST /explain to generate.',
      };
    }

    return {
      ...latestExplanation,
      isStale,
      latestFactHash: latestFacts.factHash,
      factSnapshot: {
        id: latestFacts.id,
        readinessScore: latestFacts.readinessScore,
        readinessBand: latestFacts.readinessBand,
        computedAt: latestFacts.computedAt,
        factHash: latestFacts.factHash,
      },
    };
  }

  /**
   * POST /api/trading/readiness/:loanId/explain
   * 
   * Generate AI-powered explanation of trading readiness.
   * Uses latest fact snapshot (deterministic).
   * 
   * Body:
   *  - verbosity: SHORT | STANDARD | DETAILED (optional, default: STANDARD)
   * 
   * Returns:
   *  - ExplainResult with summary, explanation, recommendations
   *  - Linked to immutable fact snapshot (factHash)
   */
  @Post(':loanId/explain')
  @Roles('TRADING_ANALYST', 'TRADING_VIEWER', 'TENANT_ADMIN', 'COMPLIANCE_AUDITOR')
  async explainReadiness(
    @Param('loanId') loanId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const correlationId = (req as any).correlationId;

    // Validate request body
    const parsed = ExplainReadinessRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    // Get latest fact snapshot (deterministic)
    const latestFacts = await this.facts.latestForLoan(loanId);
    if (!latestFacts) {
      throw new BadRequestException(
        `No trading readiness fact snapshot found for loanId=${loanId}. Recompute facts first.`,
      );
    }

    // Derive audience from user roles (role-aware)
    const roles = user?.roles ?? [];
    const audience = deriveAudience(roles);
    const verbosity = parsed.data.verbosity;

    // Build strictly bounded input to AI layer (facts only, no computation)
    const explainInput = {
      facts: {
        tenantId: latestFacts.tenantId,
        loanId: latestFacts.loanId,
        readinessScore: latestFacts.readinessScore,
        readinessBand: latestFacts.readinessBand,
        contributingFactors: latestFacts.contributingFactors,
        blockingIssues: latestFacts.blockingIssues,
        computedAt: latestFacts.computedAt,
        computedBy: latestFacts.computedBy,
        factVersion: latestFacts.factVersion,
        factHash: latestFacts.factHash,
      },
      audience,
      verbosity,
    };

    // Explainability service writes audit events + caches result
    const explanation = await this.explainability.explainTradingReadiness({
      actorUserId: user?.userId,
      loanId,
      factHash: latestFacts.factHash,
      tenantId: latestFacts.tenantId,
      audience,
      verbosity,
      explainVersion: 1,
      input: explainInput,
      correlationId,
    });

    return {
      ...explanation,
      factSnapshot: {
        id: latestFacts.id,
        readinessScore: latestFacts.readinessScore,
        readinessBand: latestFacts.readinessBand,
        computedAt: latestFacts.computedAt,
        factHash: latestFacts.factHash,
      },
    };
  }

  /**
   * POST /api/trading/readiness/:loanId/explain/recompute
   * 
   * Manually trigger explanation recomputation (async job).
   * Used when user clicks "Recompute" on stale explanation.
   * 
   * B9.5: Manual recompute endpoint
   */
  @Post(':loanId/explain/recompute')
  @Roles('TRADING_ANALYST', 'TENANT_ADMIN')
  async recomputeExplanation(
    @Param('loanId') loanId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const correlationId = (req as any).correlationId;

    // Validate request body
    const parsed = ExplainReadinessRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    // Get latest fact snapshot
    const latestFacts = await this.facts.latestForLoan(loanId);
    if (!latestFacts) {
      throw new BadRequestException(
        `No trading readiness fact snapshot found for loanId=${loanId}. Recompute facts first.`,
      );
    }

    // Derive audience from user roles
    const roles = user?.roles ?? [];
    const audience = deriveAudience(roles);
    const verbosity = parsed.data.verbosity;

    // B9.5: Enqueue manual recompute job
    await this.aiJobs.enqueueTradingExplainRecompute({
      tenantId: latestFacts.tenantId,
      loanId,
      factHash: latestFacts.factHash,
      audience,
      verbosity,
      actorUserId: user?.userId,
      correlationId,
    });

    // B9.5: Audit event for manual recompute
    const auditService = (this.explainability as any).audit;
    await auditService.record({
      tenantId: latestFacts.tenantId,
      type: 'AI_EXPLAIN_RECOMPUTE_REQUESTED',
      summary: 'Manual explanation recompute requested via UI',
      evidenceRef: loanId,
      actor: {
        type: 'USER',
        userId: user?.userId,
      },
      correlationId,
      payload: {
        module: 'TRADING',
        loanId,
        factHash: latestFacts.factHash,
        audience,
        verbosity,
        reason: 'Manual recompute via UI',
      },
    });

    return {
      success: true,
      message: 'Explanation recompute job enqueued',
      jobDetails: {
        loanId,
        factHash: latestFacts.factHash,
        audience,
        verbosity,
        correlationId,
      },
    };
  }
}
