import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { computeFactHash } from '../trading-readiness-facts/fact-hash';

/**
 * ESG KPI Facts Service
 * 
 * Week 3 - Track A: Explainable Intelligence
 * 
 * Computes and persists deterministic ESG KPI fact snapshots.
 * AI must NEVER compute these facts - they come from your ESG evaluation logic.
 */
@Injectable()
export class EsgKpiFactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Compute and persist ESG KPI fact snapshot
   * 
   * TODO: Replace placeholders with your deterministic ESG evaluator output.
   * AI must NEVER compute these facts.
   * 
   * B8.2: Now includes drift detection - compares with previous snapshot.
   * 
   * @param loanId - Loan identifier
   * @param kpiId - KPI identifier
   * @param correlationId - Request correlation ID
   * @returns Snapshot + drift detection flag
   */
  async computeAndPersist(loanId: string, kpiId: string, correlationId?: string) {
    // Get tenantId from Prisma context
    const tenantId = (this.prisma as any).tenantId?.();
    if (!tenantId) {
      throw new Error('Tenant context missing for ESG KPI fact computation');
    }

    // B8.2: Fetch previous latest snapshot for drift detection
    const prevSnapshot = await this.prisma.esgKpiFactSnapshot.findFirst({
      where: { tenantId, loanId, kpiId },
      orderBy: { computedAt: 'desc' },
      select: { factHash: true, computedAt: true },
    });

    // ---- DETERMINISTIC OUTPUTS (PLACEHOLDER) ----
    // TODO: Replace with your actual ESG evaluation logic
    const kpiCode = 'SCOPE2';
    const kpiName = 'Scope 2 Emissions';
    const status: 'PASS' | 'FAIL' | 'NEEDS_VERIFICATION' | 'UNKNOWN' = 'NEEDS_VERIFICATION';
    const score: number | null = null;
    const reasonCodes = ['MISSING_VERIFICATION_EVIDENCE'];

    const measurement = {
      value: 123.4,
      unit: 'tCO2e',
      period: '2025-Q4',
      methodology: 'market-based',
    };

    const evidence = {
      docIds: [],
      objects: [],
      notes: ['No verifier evidence attached'],
    };

    const verification = {
      status: 'UNVERIFIED',
      verifierUserId: null,
      verifiedAt: null,
    };

    const sources = {
      origin: 'ESG_MODULE',
      inputs: ['manual-entry'],
      lastUpdatedAt: new Date().toISOString(),
    };
    // --------------------------------------------

    const factCore = {
      loanId,
      kpiId,
      kpiCode,
      kpiName,
      status,
      score,
      reasonCodes,
      measurement,
      evidence,
      verification,
      sources,
      factVersion: 1,
    };

    const factHash = computeFactHash(factCore);

    const row = await this.prisma.esgKpiFactSnapshot.upsert({
      where: { factHash },
      update: {}, // Immutable: if hash already exists, do nothing
      create: {
        tenantId,
        loanId,
        kpiId,
        kpiCode,
        kpiName,
        status,
        score,
        reasonCodes,
        measurement,
        evidence,
        verification,
        sources,
        computedBy: 'SYSTEM',
        factVersion: 1,
        factHash,
        correlationId,
      },
    });

    await this.audit.record({
      tenantId,
      type: 'COMPUTE_KPI_FACT_SNAPSHOT',
      summary: `Computed ESG KPI fact snapshot for ${kpiCode}`,
      evidenceRef: loanId,
      actor: { type: 'SERVICE', clientId: 'lexa-ledger-system' },
      payload: { kpiId, kpiCode, status, factHash, factVersion: 1 },
      correlationId,
    });

    // B8.2: Drift detection (facts changed?)
    const drifted = !!prevSnapshot?.factHash && prevSnapshot.factHash !== factHash;

    if (drifted) {
      // Emit FACT_DRIFT_DETECTED audit event (module: ESG)
      await this.audit.record({
        tenantId,
        type: 'FACT_DRIFT_DETECTED',
        summary: 'ESG KPI fact snapshot changed - explanations may be stale',
        evidenceRef: loanId,
        actor: {
          type: 'SERVICE',
          clientId: 'esg-kpi-facts-service',
        },
        correlationId,
        payload: {
          module: 'ESG',
          kpiId,
          prevFactHash: prevSnapshot.factHash,
          nextFactHash: factHash,
          prevComputedAt: prevSnapshot.computedAt,
          nextComputedAt: row.computedAt,
          reason: 'ESG KPI fact snapshot changed after recompute',
        },
      });
    }

    return { snapshot: row, drifted };
  }

  /**
   * Get latest fact snapshot for a KPI
   * 
   * @param loanId - Loan identifier
   * @param kpiId - KPI identifier
   * @returns Latest fact snapshot or null
   */
  async latest(loanId: string, kpiId: string) {
    const tenantId = (this.prisma as any).tenantId?.();
    if (!tenantId) {
      throw new Error('Tenant context missing');
    }

    return this.prisma.esgKpiFactSnapshot.findFirst({
      where: { tenantId, loanId, kpiId },
      orderBy: { computedAt: 'desc' },
    });
  }
}
