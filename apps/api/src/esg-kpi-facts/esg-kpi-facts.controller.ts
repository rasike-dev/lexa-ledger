import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { ExplainabilityService } from '../explainability/explainability.service';
import { EsgKpiFactsService } from './esg-kpi-facts.service';
import { ExplainReadinessRequestSchema } from '../trading-readiness-facts/dto/explain-readiness.dto';
import { TenantUser } from '../auth/tenant-user.decorator';
import { AiJobsProducer } from '../ai/jobs/ai-jobs.producer';

/**
 * ESG KPI Facts Controller
 * 
 * Week 3 - Track A: Explainable Intelligence
 * 
 * Endpoints for ESG KPI fact snapshots and explanations.
 * Same pattern as Trading Readiness: facts-first, cached explanations, audit-safe.
 */
@Controller('esg/kpis')
export class EsgKpiFactsController {
  constructor(
    private readonly facts: EsgKpiFactsService,
    private readonly explain: ExplainabilityService,
    private readonly aiJobs: AiJobsProducer, // B7.2: Async explanation jobs
  ) {}

  /**
   * Recompute ESG KPI fact snapshot (deterministic)
   * 
   * RBAC: ESG_ANALYST, TENANT_ADMIN
   * 
   * B8.2: Now with drift detection - only enqueues explanation job if facts changed
   */
  @Post(':loanId/:kpiId/facts/recompute')
  @Roles('ESG_ANALYST', 'TENANT_ADMIN')
  async recompute(
    @Param('loanId') loanId: string,
    @Param('kpiId') kpiId: string,
    @TenantUser() user?: { userId?: string; correlationId?: string },
  ) {
    const { snapshot, drifted } = await this.facts.computeAndPersist(loanId, kpiId, user?.correlationId);

    // B8.2: Only enqueue explanation job if facts changed (drift detected)
    // This saves AI costs and avoids regenerating identical explanations
    if (drifted) {
      await this.aiJobs.enqueueEsgKpiExplainRecompute({
        tenantId: snapshot.tenantId,
        loanId,
        kpiId,
        factHash: snapshot.factHash,
        audience: 'ESG_ANALYST', // Default audience for auto-generated explanations
        verbosity: 'STANDARD',    // Default verbosity
        actorUserId: user?.userId,
        correlationId: user?.correlationId,
      });
    }

    return { snapshot, drifted };
  }

  /**
   * Get latest ESG KPI fact snapshot
   * 
   * RBAC: ESG_ANALYST, ESG_VERIFIER, TENANT_ADMIN, COMPLIANCE_AUDITOR
   */
  @Get(':loanId/:kpiId/facts/latest')
  @Roles('ESG_ANALYST', 'ESG_VERIFIER', 'TENANT_ADMIN', 'COMPLIANCE_AUDITOR')
  async latest(@Param('loanId') loanId: string, @Param('kpiId') kpiId: string) {
    return this.facts.latest(loanId, kpiId);
  }

  /**
   * GET /esg/kpis/:loanId/:kpiId/explain/latest
   * 
   * Retrieve latest cached explanation (without regenerating).
   * Returns staleness indicator if facts have changed.
   * 
   * B9: Staleness detection for drift-aware UI
   */
  @Get(':loanId/:kpiId/explain/latest')
  @Roles('ESG_ANALYST', 'ESG_VERIFIER', 'TENANT_ADMIN', 'COMPLIANCE_AUDITOR')
  async getLatestExplanation(
    @Param('loanId') loanId: string,
    @Param('kpiId') kpiId: string,
    @Query('audience') audienceParam?: string,
    @Query('verbosity') verbosityParam?: string,
    @TenantUser() user?: { roles: string[] },
  ) {
    // Derive audience
    const audience = audienceParam || (user?.roles?.includes('ESG_VERIFIER') ? 'ESG_VERIFIER' : 'ESG_ANALYST');
    const verbosity = verbosityParam || 'STANDARD';

    // Get latest fact snapshot
    const latestFacts = await this.facts.latest(loanId, kpiId);
    if (!latestFacts) {
      throw new BadRequestException(
        `No KPI fact snapshot found for loanId=${loanId}, kpiId=${kpiId}. Recompute facts first.`,
      );
    }

    // Get latest cached explanation
    const tenantId = latestFacts.tenantId;
    const latestExplanation = await (this.explain as any).prisma.esgKpiExplanation.findFirst({
      where: { tenantId, loanId, kpiId, audience, verbosity },
      orderBy: { generatedAt: 'desc' },
    });

    // B9: Detect staleness
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
        kpiCode: latestFacts.kpiCode,
        kpiName: latestFacts.kpiName,
        status: latestFacts.status,
        computedAt: latestFacts.computedAt,
        factHash: latestFacts.factHash,
      },
    };
  }

  /**
   * Generate AI explanation for ESG KPI assessment
   * 
   * Cached by: factHash + audience + verbosity
   * Audit events: EXPLAIN_KPI_REQUESTED, EXPLAIN_KPI_GENERATED, EXPLAIN_KPI_CACHE_HIT
   * 
   * RBAC: ESG_ANALYST, ESG_VERIFIER, TENANT_ADMIN, COMPLIANCE_AUDITOR
   */
  @Post(':loanId/:kpiId/explain')
  @Roles('ESG_ANALYST', 'ESG_VERIFIER', 'TENANT_ADMIN', 'COMPLIANCE_AUDITOR')
  async explainKpi(
    @Param('loanId') loanId: string,
    @Param('kpiId') kpiId: string,
    @Body() body: unknown,
    @TenantUser() user?: { userId: string; roles: string[]; correlationId?: string },
  ) {
    const parsed = ExplainReadinessRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const facts = await this.facts.latest(loanId, kpiId);
    if (!facts) {
      throw new BadRequestException(
        `No KPI fact snapshot found for loanId=${loanId}, kpiId=${kpiId}. Recompute facts first.`,
      );
    }

    const verbosity = parsed.data.verbosity;
    const audience = user?.roles?.includes('ESG_VERIFIER') ? 'ESG_VERIFIER' : 'ESG_ANALYST';

    const explainInput = {
      facts: {
        tenantId: facts.tenantId,
        loanId: facts.loanId,
        kpiId: facts.kpiId,
        kpiCode: facts.kpiCode,
        kpiName: facts.kpiName,
        status: facts.status,
        score: facts.score,
        reasonCodes: facts.reasonCodes,
        measurement: facts.measurement,
        evidence: facts.evidence,
        verification: facts.verification,
        sources: facts.sources,
        computedAt: facts.computedAt,
        computedBy: facts.computedBy,
        factVersion: facts.factVersion,
        factHash: facts.factHash,
      },
      audience,
      verbosity,
    };

    return this.explain.explainEsgKpi({
      actorUserId: user?.userId,
      tenantId: facts.tenantId,
      loanId,
      kpiId,
      factHash: facts.factHash,
      audience,
      verbosity,
      explainVersion: 1,
      input: explainInput,
      correlationId: user?.correlationId,
    });
  }

  /**
   * POST /esg/kpis/:loanId/:kpiId/explain/recompute
   * 
   * Manually trigger explanation recomputation (async job).
   * Used when user clicks "Recompute" on stale explanation.
   * 
   * B9.5: Manual recompute endpoint
   */
  @Post(':loanId/:kpiId/explain/recompute')
  @Roles('ESG_ANALYST', 'TENANT_ADMIN')
  async recomputeExplanation(
    @Param('loanId') loanId: string,
    @Param('kpiId') kpiId: string,
    @Body() body: unknown,
    @TenantUser() user?: { userId: string; roles: string[]; correlationId?: string },
  ) {
    // Validate request body
    const parsed = ExplainReadinessRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    // Get latest fact snapshot
    const latestFacts = await this.facts.latest(loanId, kpiId);
    if (!latestFacts) {
      throw new BadRequestException(
        `No KPI fact snapshot found for loanId=${loanId}, kpiId=${kpiId}. Recompute facts first.`,
      );
    }

    // Derive audience
    const audience = user?.roles?.includes('ESG_VERIFIER') ? 'ESG_VERIFIER' : 'ESG_ANALYST';
    const verbosity = parsed.data.verbosity;

    // B9.5: Enqueue manual recompute job
    await this.aiJobs.enqueueEsgKpiExplainRecompute({
      tenantId: latestFacts.tenantId,
      loanId,
      kpiId,
      factHash: latestFacts.factHash,
      audience,
      verbosity,
      actorUserId: user?.userId,
      correlationId: user?.correlationId,
    });

    // B9.5: Audit event for manual recompute
    const auditService = (this.explain as any).audit;
    await auditService.record({
      tenantId: latestFacts.tenantId,
      type: 'AI_EXPLAIN_RECOMPUTE_REQUESTED',
      summary: 'Manual ESG KPI explanation recompute requested via UI',
      evidenceRef: loanId,
      actor: {
        type: 'USER',
        userId: user?.userId,
      },
      correlationId: user?.correlationId,
      payload: {
        module: 'ESG',
        loanId,
        kpiId,
        factHash: latestFacts.factHash,
        audience,
        verbosity,
        reason: 'Manual recompute via UI',
      },
    });

    return {
      success: true,
      message: 'ESG KPI explanation recompute job enqueued',
      jobDetails: {
        loanId,
        kpiId,
        factHash: latestFacts.factHash,
        audience,
        verbosity,
        correlationId: user?.correlationId,
      },
    };
  }
}
