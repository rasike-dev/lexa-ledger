import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { ExplainabilityService } from '../explainability/explainability.service';
import { CovenantFactsService } from './covenant-facts.service';
import { ExplainReadinessRequestSchema } from '../trading-readiness-facts/dto/explain-readiness.dto';
import { TenantUser } from '../auth/tenant-user.decorator';
import { AiJobsProducer } from '../ai/jobs/ai-jobs.producer';

/**
 * Covenant Facts Controller
 * 
 * Week 3 - Track A: Explainable Intelligence
 * 
 * Endpoints for covenant evaluation snapshots and explanations.
 * 
 * SAFETY RULE:
 * ✅ AI explains evaluated covenant logic + numeric triggers
 * ❌ AI does NOT interpret raw legal text or invent obligations
 */
@Controller('servicing/covenants')
export class CovenantFactsController {
  constructor(
    private readonly facts: CovenantFactsService,
    private readonly explain: ExplainabilityService,
    private readonly aiJobs: AiJobsProducer, // B7.3: Async explanation jobs
  ) {}

  /**
   * Recompute covenant evaluation fact snapshot (deterministic)
   * 
   * RBAC: SERVICING_MANAGER, TENANT_ADMIN
   * 
   * B8.2: Now with drift detection - only enqueues explanation job if facts changed
   */
  @Post(':loanId/:covenantId/facts/recompute')
  @Roles('SERVICING_MANAGER', 'TENANT_ADMIN')
  async recompute(
    @Param('loanId') loanId: string,
    @Param('covenantId') covenantId: string,
    @TenantUser() user?: { userId?: string; correlationId?: string },
  ) {
    const { snapshot, drifted } = await this.facts.computeAndPersist(loanId, covenantId, user?.correlationId);

    // B8.2: Only enqueue explanation job if facts changed (drift detected)
    // This saves AI costs and avoids regenerating identical explanations
    if (drifted) {
      await this.aiJobs.enqueueCovenantExplainRecompute({
        tenantId: snapshot.tenantId,
        loanId,
        covenantId,
        factHash: snapshot.factHash,
        audience: 'SERVICING_MANAGER', // Default audience for auto-generated explanations
        verbosity: 'STANDARD',          // Default verbosity
        actorUserId: user?.userId,
        correlationId: user?.correlationId,
      });
    }

    return { snapshot, drifted };
  }

  /**
   * Get latest covenant evaluation fact snapshot
   * 
   * RBAC: SERVICING_MANAGER, RISK_OFFICER, TENANT_ADMIN, COMPLIANCE_AUDITOR
   */
  @Get(':loanId/:covenantId/facts/latest')
  @Roles('SERVICING_MANAGER', 'RISK_OFFICER', 'TENANT_ADMIN', 'COMPLIANCE_AUDITOR')
  async latest(@Param('loanId') loanId: string, @Param('covenantId') covenantId: string) {
    return this.facts.latest(loanId, covenantId);
  }

  /**
   * GET /servicing/covenants/:loanId/:covenantId/explain/latest
   * 
   * Retrieve latest cached explanation (without regenerating).
   * Returns staleness indicator if facts have changed.
   * 
   * B9: Staleness detection for drift-aware UI
   */
  @Get(':loanId/:covenantId/explain/latest')
  @Roles('SERVICING_MANAGER', 'RISK_OFFICER', 'TENANT_ADMIN', 'COMPLIANCE_AUDITOR')
  async getLatestExplanation(
    @Param('loanId') loanId: string,
    @Param('covenantId') covenantId: string,
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
        : 'SERVICING_MANAGER');
    const verbosity = verbosityParam || 'STANDARD';

    // Get latest fact snapshot
    const latestFacts = await this.facts.latest(loanId, covenantId);
    if (!latestFacts) {
      throw new BadRequestException(
        `No covenant fact snapshot found for loanId=${loanId}, covenantId=${covenantId}. Recompute facts first.`,
      );
    }

    // Get latest cached explanation
    const tenantId = latestFacts.tenantId;
    const latestExplanation = await (this.explain as any).prisma.covenantExplanation.findFirst({
      where: { tenantId, loanId, covenantId, audience, verbosity },
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
        covenantName: latestFacts.covenantName,
        status: latestFacts.status,
        computedAt: latestFacts.computedAt,
        factHash: latestFacts.factHash,
      },
    };
  }

  /**
   * Generate AI explanation for covenant breach assessment
   * 
   * SAFETY: Provides evaluated rule + numeric triggers only. No raw clause text.
   * 
   * Cached by: factHash + audience + verbosity
   * Audit events: EXPLAIN_COVENANT_REQUESTED, EXPLAIN_COVENANT_GENERATED, EXPLAIN_COVENANT_CACHE_HIT
   * 
   * RBAC: SERVICING_MANAGER, RISK_OFFICER, TENANT_ADMIN, COMPLIANCE_AUDITOR
   */
  @Post(':loanId/:covenantId/explain')
  @Roles('SERVICING_MANAGER', 'RISK_OFFICER', 'TENANT_ADMIN', 'COMPLIANCE_AUDITOR')
  async explainCovenant(
    @Param('loanId') loanId: string,
    @Param('covenantId') covenantId: string,
    @Body() body: unknown,
    @TenantUser() user?: { userId: string; roles: string[]; correlationId?: string },
  ) {
    const parsed = ExplainReadinessRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const facts = await this.facts.latest(loanId, covenantId);
    if (!facts) {
      throw new BadRequestException(
        `No covenant fact snapshot found for loanId=${loanId}, covenantId=${covenantId}. Recompute facts first.`,
      );
    }

    const verbosity = parsed.data.verbosity;
    const roles = user?.roles ?? [];
    const audience = roles.includes('COMPLIANCE_AUDITOR')
      ? 'COMPLIANCE_AUDITOR'
      : roles.includes('RISK_OFFICER')
        ? 'RISK_OFFICER'
        : 'SERVICING_MANAGER';

    const explainInput = {
      // SAFETY: provide evaluated rule + numeric triggers only. No raw clause text.
      facts: {
        tenantId: facts.tenantId,
        loanId: facts.loanId,
        covenantId: facts.covenantId,
        covenantName: facts.covenantName,
        covenantType: facts.covenantType,
        status: facts.status,
        threshold: facts.threshold,
        observed: facts.observed,
        breachDetail: facts.breachDetail,
        inputSignals: facts.inputSignals,
        sourceRefs: facts.sourceRefs,
        computedAt: facts.computedAt,
        computedBy: facts.computedBy,
        factVersion: facts.factVersion,
        factHash: facts.factHash,
      },
      audience,
      verbosity,
      safety: {
        noLegalInterpretation: true,
        noNewObligations: true,
        explainFromFactsOnly: true,
      },
    };

    return this.explain.explainCovenant({
      actorUserId: user?.userId,
      tenantId: facts.tenantId,
      loanId,
      covenantId,
      factHash: facts.factHash,
      audience,
      verbosity,
      explainVersion: 1,
      input: explainInput,
      correlationId: user?.correlationId,
    });
  }

  /**
   * POST /servicing/covenants/:loanId/:covenantId/explain/recompute
   * 
   * Manually trigger explanation recomputation (async job).
   * Used when user clicks "Recompute" on stale explanation.
   * 
   * B9.5: Manual recompute endpoint
   */
  @Post(':loanId/:covenantId/explain/recompute')
  @Roles('SERVICING_MANAGER', 'TENANT_ADMIN')
  async recomputeExplanation(
    @Param('loanId') loanId: string,
    @Param('covenantId') covenantId: string,
    @Body() body: unknown,
    @TenantUser() user?: { userId: string; roles: string[]; correlationId?: string },
  ) {
    // Validate request body
    const parsed = ExplainReadinessRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    // Get latest fact snapshot
    const latestFacts = await this.facts.latest(loanId, covenantId);
    if (!latestFacts) {
      throw new BadRequestException(
        `No covenant fact snapshot found for loanId=${loanId}, covenantId=${covenantId}. Recompute facts first.`,
      );
    }

    // Derive audience
    const roles = user?.roles ?? [];
    const audience = roles.includes('COMPLIANCE_AUDITOR')
      ? 'COMPLIANCE_AUDITOR'
      : roles.includes('RISK_OFFICER')
        ? 'RISK_OFFICER'
        : 'SERVICING_MANAGER';
    const verbosity = parsed.data.verbosity;

    // B9.5: Enqueue manual recompute job
    await this.aiJobs.enqueueCovenantExplainRecompute({
      tenantId: latestFacts.tenantId,
      loanId,
      covenantId,
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
      summary: 'Manual covenant explanation recompute requested via UI',
      evidenceRef: loanId,
      actor: {
        type: 'USER',
        userId: user?.userId,
      },
      correlationId: user?.correlationId,
      payload: {
        module: 'SERVICING',
        loanId,
        covenantId,
        factHash: latestFacts.factHash,
        audience,
        verbosity,
        reason: 'Manual recompute via UI',
      },
    });

    return {
      success: true,
      message: 'Covenant explanation recompute job enqueued',
      jobDetails: {
        loanId,
        covenantId,
        factHash: latestFacts.factHash,
        audience,
        verbosity,
        correlationId: user?.correlationId,
      },
    };
  }
}
