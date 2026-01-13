import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { computeFactHash } from '../trading-readiness-facts/fact-hash';

/**
 * Portfolio Intelligence Service
 * 
 * Week 3 - Track A: Explainable Intelligence (Portfolio Level)
 * 
 * Computes and persists deterministic portfolio risk snapshots.
 * Uses only aggregated facts - no individual loan PII.
 */
@Injectable()
export class PortfolioIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Compute and persist portfolio risk fact snapshot
   * 
   * TODO: Replace placeholders with real aggregates from your existing portfolio views
   * 
   * B8.2: Now includes drift detection - compares with previous snapshot.
   * 
   * @param asOfDate - Snapshot date
   * @param correlationId - Request correlation ID
   * @returns Snapshot + drift detection flag
   */
  async computeAndPersist(asOfDate: Date, correlationId?: string) {
    // Get tenantId from Prisma context
    const tenantId = (this.prisma as any).tenantId?.();
    if (!tenantId) {
      throw new Error('Tenant context missing for portfolio fact computation');
    }

    // B8.2: Fetch previous latest snapshot for drift detection
    const prevSnapshot = await this.prisma.portfolioRiskFactSnapshot.findFirst({
      where: { tenantId },
      orderBy: { computedAt: 'desc' },
      select: { factHash: true, computedAt: true },
    });

    // ---- DETERMINISTIC AGGREGATES (PLACEHOLDER) ----
    // TODO: Replace with real aggregates from your portfolio queries
    const totals = {
      loans: 12,
      exposure: 250_000_000,
      currency: 'USD',
    };

    const distributions = {
      readinessBands: { GREEN: 4, AMBER: 6, RED: 2 },
      covenantStatus: { COMPLIANT: 7, AT_RISK: 3, BREACH: 2 },
      esgStatus: { PASS: 5, NEEDS_VERIFICATION: 6, FAIL: 1 },
    };

    const topDrivers = [
      { driver: 'Missing ESG verification evidence', count: 6 },
      { driver: 'Covenant breaches (DSCR)', count: 2 },
      { driver: 'Documentation gaps', count: 3 },
    ];

    const anomalies = [
      { type: 'SPIKE', metric: 'NEEDS_VERIFICATION', delta: '+3 vs last period' },
    ];
    // --------------------------------------------

    const factCore = {
      portfolioId: null,
      asOfDate: asOfDate.toISOString(),
      totals,
      distributions,
      topDrivers,
      anomalies,
      factVersion: 1,
    };

    const factHash = computeFactHash(factCore);

    const row = await this.prisma.portfolioRiskFactSnapshot.upsert({
      where: { factHash },
      update: {}, // Immutable: if hash already exists, do nothing
      create: {
        tenantId,
        portfolioId: null,
        asOfDate,
        totals,
        distributions,
        topDrivers,
        anomalies,
        computedBy: 'SYSTEM',
        factVersion: 1,
        factHash,
        correlationId,
      },
    });

    await this.audit.record({
      tenantId,
      type: 'COMPUTE_PORTFOLIO_RISK_FACT_SNAPSHOT',
      summary: `Computed portfolio risk fact snapshot`,
      evidenceRef: 'default',
      actor: { type: 'SERVICE', clientId: 'lexa-ledger-system' },
      payload: { factHash, asOfDate: asOfDate.toISOString(), factVersion: 1 },
      correlationId,
    });

    // B8.2: Drift detection (facts changed?)
    const drifted = !!prevSnapshot?.factHash && prevSnapshot.factHash !== factHash;

    if (drifted) {
      // Emit FACT_DRIFT_DETECTED audit event (module: PORTFOLIO)
      await this.audit.record({
        tenantId,
        type: 'FACT_DRIFT_DETECTED',
        summary: 'Portfolio risk fact snapshot changed - explanations may be stale',
        evidenceRef: row.portfolioId ?? 'default',
        actor: {
          type: 'SERVICE',
          clientId: 'portfolio-intelligence-service',
        },
        correlationId,
        payload: {
          module: 'PORTFOLIO',
          prevFactHash: prevSnapshot.factHash,
          nextFactHash: factHash,
          prevComputedAt: prevSnapshot.computedAt,
          nextComputedAt: row.computedAt,
          reason: 'Portfolio risk fact snapshot changed after recompute',
        },
      });
    }

    return { snapshot: row, drifted };
  }

  /**
   * Get latest portfolio risk fact snapshot
   * 
   * @returns Latest snapshot or null
   */
  async latest() {
    const tenantId = (this.prisma as any).tenantId?.();
    if (!tenantId) {
      throw new Error('Tenant context missing');
    }

    return this.prisma.portfolioRiskFactSnapshot.findFirst({
      where: { tenantId },
      orderBy: { computedAt: 'desc' },
    });
  }
}
