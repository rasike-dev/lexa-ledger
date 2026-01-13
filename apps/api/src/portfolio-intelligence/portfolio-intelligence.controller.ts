import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { PortfolioIntelligenceService } from './portfolio-intelligence.service';
import { ExplainabilityService } from '../explainability/explainability.service';
import { ExplainReadinessRequestSchema } from '../trading-readiness-facts/dto/explain-readiness.dto';
import { TenantUser } from '../auth/tenant-user.decorator';
import { AiJobsProducer } from '../ai/jobs/ai-jobs.producer';

/**
 * Portfolio Intelligence Controller
 * 
 * Week 3 - Track A: Portfolio-level Explainability
 * 
 * Endpoints for portfolio risk snapshots and explanations.
 * Uses only deterministic aggregates - no individual loan PII.
 */
@Controller('portfolio/intelligence')
export class PortfolioIntelligenceController {
  constructor(
    private readonly portfolio: PortfolioIntelligenceService,
    private readonly explain: ExplainabilityService,
    private readonly aiJobs: AiJobsProducer, // B7.4: Async explanation jobs
  ) {}

  /**
   * Get latest portfolio risk fact snapshot
   * 
   * RBAC: RISK_OFFICER, TENANT_ADMIN, COMPLIANCE_AUDITOR
   */
  @Get('facts/latest')
  @Roles('RISK_OFFICER', 'TENANT_ADMIN', 'COMPLIANCE_AUDITOR')
  async latestFacts() {
    return this.portfolio.latest();
  }

  /**
   * Recompute portfolio risk fact snapshot
   * 
   * RBAC: RISK_OFFICER, TENANT_ADMIN
   * 
   * B8.2: Now with drift detection - only enqueues explanation job if facts changed
   */
  @Post('facts/recompute')
  @Roles('RISK_OFFICER', 'TENANT_ADMIN')
  async recomputeFacts(@TenantUser() user?: { userId?: string; correlationId?: string }) {
    const { snapshot, drifted } = await this.portfolio.computeAndPersist(new Date(), user?.correlationId);

    // B8.2: Only enqueue explanation job if facts changed (drift detected)
    // This saves AI costs and avoids regenerating identical explanations
    if (drifted) {
      await this.aiJobs.enqueuePortfolioRiskExplainRecompute({
        tenantId: snapshot.tenantId,
        portfolioId: snapshot.portfolioId ?? null,
        factHash: snapshot.factHash,
        audience: 'RISK_OFFICER', // Default audience for auto-generated explanations
        verbosity: 'STANDARD',     // Default verbosity
        actorUserId: user?.userId,
        correlationId: user?.correlationId,
      });
    }

    return { snapshot, drifted };
  }

  /**
   * GET /portfolio/intelligence/explain/latest
   * 
   * Retrieve latest cached explanation (without regenerating).
   * Returns staleness indicator if facts have changed.
   * 
   * B9: Staleness detection for drift-aware UI
   */
  @Get('explain/latest')
  @Roles('RISK_OFFICER', 'TENANT_ADMIN', 'COMPLIANCE_AUDITOR')
  async getLatestExplanation(
    @Query('audience') audienceParam?: string,
    @Query('verbosity') verbosityParam?: string,
    @TenantUser() user?: { roles: string[] },
  ) {
    // Derive audience
    const roles = user?.roles ?? [];
    const audience = audienceParam || (roles.includes('COMPLIANCE_AUDITOR')
      ? 'COMPLIANCE_AUDITOR'
      : roles.includes('RISK_OFFICER')
        ? 'RISK_OFFICER'
        : 'TENANT_ADMIN');
    const verbosity = verbosityParam || 'STANDARD';

    // Get latest fact snapshot
    const latestFacts = await this.portfolio.latest();
    if (!latestFacts) {
      throw new BadRequestException(
        `No portfolio fact snapshot found. Recompute facts first.`,
      );
    }

    // Get latest cached explanation
    const tenantId = latestFacts.tenantId;
    const portfolioId = latestFacts.portfolioId ?? 'default';
    const latestExplanation = await (this.explain as any).prisma.portfolioRiskExplanation.findFirst({
      where: { tenantId, portfolioId, audience, verbosity },
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
        asOfDate: latestFacts.asOfDate,
        totals: latestFacts.totals,
        computedAt: latestFacts.computedAt,
        factHash: latestFacts.factHash,
      },
    };
  }

  /**
   * Generate AI explanation for portfolio risk distribution
   * 
   * Cached by: factHash + audience + verbosity
   * Audit events: EXPLAIN_PORTFOLIO_RISK_REQUESTED, EXPLAIN_PORTFOLIO_RISK_GENERATED, EXPLAIN_PORTFOLIO_RISK_CACHE_HIT
   * 
   * RBAC: RISK_OFFICER, TENANT_ADMIN, COMPLIANCE_AUDITOR
   */
  @Post('explain')
  @Roles('RISK_OFFICER', 'TENANT_ADMIN', 'COMPLIANCE_AUDITOR')
  async explainPortfolio(
    @Body() body: unknown,
    @TenantUser() user?: { userId: string; roles: string[]; correlationId?: string },
  ) {
    const parsed = ExplainReadinessRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const facts = await this.portfolio.latest();
    if (!facts) {
      throw new BadRequestException(
        `No portfolio fact snapshot found. Recompute facts first.`,
      );
    }

    const roles = user?.roles ?? [];
    const audience = roles.includes('COMPLIANCE_AUDITOR')
      ? 'COMPLIANCE_AUDITOR'
      : roles.includes('RISK_OFFICER')
        ? 'RISK_OFFICER'
        : 'TENANT_ADMIN';

    const verbosity = parsed.data.verbosity;

    const explainInput = {
      facts: {
        tenantId: facts.tenantId,
        portfolioId: facts.portfolioId,
        asOfDate: facts.asOfDate,
        totals: facts.totals,
        distributions: facts.distributions,
        topDrivers: facts.topDrivers,
        anomalies: facts.anomalies,
        computedAt: facts.computedAt,
        computedBy: facts.computedBy,
        factVersion: facts.factVersion,
        factHash: facts.factHash,
      },
      audience,
      verbosity,
    };

    return this.explain.explainPortfolioRisk({
      actorUserId: user?.userId,
      tenantId: facts.tenantId,
      portfolioId: facts.portfolioId ?? null,
      factHash: facts.factHash,
      audience,
      verbosity,
      explainVersion: 1,
      input: explainInput,
      correlationId: user?.correlationId,
    });
  }

  /**
   * POST /portfolio/intelligence/explain/recompute
   * 
   * Manually trigger explanation recomputation (async job).
   * Used when user clicks "Recompute" on stale explanation.
   * 
   * B9.5: Manual recompute endpoint
   */
  @Post('explain/recompute')
  @Roles('RISK_OFFICER', 'TENANT_ADMIN')
  async recomputeExplanation(
    @Body() body: unknown,
    @TenantUser() user?: { userId: string; roles: string[]; correlationId?: string },
  ) {
    // Validate request body
    const parsed = ExplainReadinessRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    // Get latest fact snapshot
    const latestFacts = await this.portfolio.latest();
    if (!latestFacts) {
      throw new BadRequestException(
        `No portfolio fact snapshot found. Recompute facts first.`,
      );
    }

    // Derive audience
    const roles = user?.roles ?? [];
    const audience = roles.includes('COMPLIANCE_AUDITOR')
      ? 'COMPLIANCE_AUDITOR'
      : roles.includes('RISK_OFFICER')
        ? 'RISK_OFFICER'
        : 'TENANT_ADMIN';
    const verbosity = parsed.data.verbosity;

    // B9.5: Enqueue manual recompute job
    await this.aiJobs.enqueuePortfolioRiskExplainRecompute({
      tenantId: latestFacts.tenantId,
      portfolioId: latestFacts.portfolioId ?? null,
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
      summary: 'Manual portfolio risk explanation recompute requested via UI',
      evidenceRef: latestFacts.portfolioId ?? 'default',
      actor: {
        type: 'USER',
        userId: user?.userId,
      },
      correlationId: user?.correlationId,
      payload: {
        module: 'PORTFOLIO',
        portfolioId: latestFacts.portfolioId ?? 'default',
        factHash: latestFacts.factHash,
        audience,
        verbosity,
        reason: 'Manual recompute via UI',
      },
    });

    return {
      success: true,
      message: 'Portfolio risk explanation recompute job enqueued',
      jobDetails: {
        portfolioId: latestFacts.portfolioId ?? 'default',
        factHash: latestFacts.factHash,
        audience,
        verbosity,
        correlationId: user?.correlationId,
      },
    };
  }
}
