/**
 * Trading Readiness Facts Service
 * 
 * Deterministic fact snapshot computation and persistence.
 * This service ONLY computes and stores facts - NO AI involvement.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TenantContext } from '../tenant/tenant-context';
import { computeFactHash } from './fact-hash';
import { ReadinessBand } from '@prisma/client';

type ContributingFactors = {
  documentationCompleteness: number; // 0..1
  covenantCompliance: boolean;
  amendmentStability: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  servicingAlerts: number;
  esgDisclosureCoverage: number; // 0..1
  auditTrailCompleteness: boolean;
};

@Injectable()
export class TradingReadinessFactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly tenantContext: TenantContext,
  ) {}

  /**
   * Determine readiness band from score (deterministic)
   */
  private bandFromScore(score: number): ReadinessBand {
    if (score >= 80) return ReadinessBand.GREEN;
    if (score >= 55) return ReadinessBand.AMBER;
    return ReadinessBand.RED;
  }

  /**
   * Compute and persist fact snapshot for a loan
   * 
   * This plugs into the existing trading readiness computation.
   * It extracts deterministic facts from the system state.
   * 
   * B8: Now includes drift detection - compares with previous snapshot.
   * 
   * @param loanId - The loan to compute facts for
   * @param correlationId - Optional correlation ID for tracing
   * @returns Snapshot + drift detection flag
   */
  async computeAndPersistForLoan(loanId: string, correlationId?: string) {
    const tenantId = this.tenantContext.tenantId;

    // B8.1: Fetch previous latest snapshot for drift detection
    const prevSnapshot = await this.prisma.tradingReadinessFactSnapshot.findFirst({
      where: { tenantId, loanId },
      orderBy: { computedAt: 'desc' },
      select: { factHash: true, computedAt: true },
    });

    // ---- Gather system state (deterministic) ----
    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, tenantId } });
    if (!loan) throw new Error('Loan not found');

    const checklist = await this.prisma.tradingChecklistItem.findMany({
      where: { tenantId, loanId },
    });

    const docs = await this.prisma.document.findMany({
      where: { tenantId, loanId },
      include: { versions: true },
    });

    const covenantCount = await this.prisma.covenant.count({ where: { tenantId, loanId } });
    const hasScenarios = !!(await this.prisma.loanScenario.findUnique({ where: { loanId } }));
    const esgKpiCount = await this.prisma.eSGKpi.count({ where: { tenantId, loanId } });
    const auditEventCount = await this.prisma.auditEvent.count({ where: { tenantId } });

    // ---- Calculate readiness score (deterministic) ----
    const totalWeight = checklist.reduce((s, i) => s + i.weight, 0) || 1;
    const doneWeight = checklist.reduce((s, i) => s + (i.status === 'DONE' ? i.weight : 0), 0);
    const readinessScore = Math.round((doneWeight / totalWeight) * 100);
    const readinessBand = this.bandFromScore(readinessScore);

    // ---- Calculate contributing factors (deterministic) ----
    const docItems = checklist.filter((i) => i.category === 'DOCUMENTS');
    const docDone = docItems.filter((i) => i.status === 'DONE').length;
    const documentationCompleteness = docItems.length > 0 ? docDone / docItems.length : 0;

    const servicingItems = checklist.filter((i) => i.category === 'SERVICING');
    const covenantCompliance = servicingItems.every((i) => i.status === 'DONE');

    const hasVersioning = docs.some((d) => d.versions.some((v) => v.version >= 2));
    let amendmentStability: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' = 'NONE';
    if (!hasVersioning) {
      amendmentStability = 'NONE';
    } else if (docs.length < 3) {
      amendmentStability = 'HIGH';
    } else if (docs.length < 6) {
      amendmentStability = 'MEDIUM';
    } else {
      amendmentStability = 'LOW';
    }

    const servicingAlerts = servicingItems.filter(
      (i) => i.status === 'OPEN' || i.status === 'BLOCKED'
    ).length;

    const esgItems = checklist.filter((i) => i.category === 'ESG');
    const esgDone = esgItems.filter((i) => i.status === 'DONE').length;
    const esgDisclosureCoverage = esgItems.length > 0 ? esgDone / esgItems.length : 0;

    const auditTrailCompleteness = auditEventCount > 0;

    const contributingFactors: ContributingFactors = {
      documentationCompleteness,
      covenantCompliance,
      amendmentStability,
      servicingAlerts,
      esgDisclosureCoverage,
      auditTrailCompleteness,
    };

    // ---- Identify blocking issues (deterministic) ----
    const blockingIssues: string[] = [];

    checklist
      .filter((i) => i.status === 'BLOCKED')
      .forEach((item) => {
        blockingIssues.push(`Blocked: ${item.title}`);
      });

    checklist
      .filter((i) => i.status === 'OPEN' && i.weight >= 15)
      .forEach((item) => {
        blockingIssues.push(`Missing: ${item.title}`);
      });

    if (docs.length === 0) blockingIssues.push('No documents uploaded');
    if (covenantCount === 0) blockingIssues.push('No covenants modeled');
    if (!hasScenarios) blockingIssues.push('Servicing scenarios not configured');

    // ---- Compute fact hash (immutability guarantee) ----
    const factCore = {
      loanId,
      readinessScore,
      readinessBand,
      contributingFactors,
      blockingIssues,
      factVersion: 1,
    };

    const factHash = computeFactHash(factCore);

    // ---- Persist fact snapshot (upsert by hash - immutable) ----
    const snapshot = await this.prisma.tradingReadinessFactSnapshot.upsert({
      where: { factHash },
      update: {}, // Immutable: if hash exists, no update needed
      create: {
        tenantId,
        loanId,
        readinessScore,
        readinessBand,
        contributingFactors,
        blockingIssues,
        computedBy: 'SYSTEM',
        factVersion: 1,
        factHash,
        correlationId,
      },
    });

    // ---- Audit: fact snapshot generation ----
    await this.audit.record({
      tenantId,
      type: 'TRADING_READINESS_FACT_COMPUTED',
      summary: 'Trading readiness fact snapshot computed',
      evidenceRef: loanId,
      actor: {
        type: 'SERVICE',
        clientId: 'trading-readiness-facts-service',
      },
      correlationId,
      payload: {
        factHash,
        readinessScore,
        readinessBand,
        factVersion: 1,
        snapshotId: snapshot.id,
      },
    });

    // B8.1: Drift detection (facts changed?)
    const drifted = !!prevSnapshot?.factHash && prevSnapshot.factHash !== factHash;

    if (drifted) {
      // Emit FACT_DRIFT_DETECTED audit event (important for demo + traceability)
      await this.audit.record({
        tenantId,
        type: 'FACT_DRIFT_DETECTED',
        summary: 'Fact snapshot changed - explanations may be stale',
        evidenceRef: loanId,
        actor: {
          type: 'SERVICE',
          clientId: 'trading-readiness-facts-service',
        },
        correlationId,
        payload: {
          module: 'TRADING',
          prevFactHash: prevSnapshot.factHash,
          nextFactHash: factHash,
          prevComputedAt: prevSnapshot.computedAt,
          nextComputedAt: snapshot.computedAt,
          reason: 'Fact snapshot changed after recompute',
        },
      });
    }

    return { snapshot, drifted };
  }

  /**
   * Get latest fact snapshot for a loan
   */
  async latestForLoan(loanId: string) {
    const tenantId = this.tenantContext.tenantId;

    return this.prisma.tradingReadinessFactSnapshot.findFirst({
      where: { tenantId, loanId },
      orderBy: { computedAt: 'desc' },
    });
  }

  /**
   * List fact snapshots for a loan (paginated)
   */
  async listForLoan(loanId: string, take = 10, cursor?: string) {
    const tenantId = this.tenantContext.tenantId;

    return this.prisma.tradingReadinessFactSnapshot.findMany({
      where: { tenantId, loanId },
      orderBy: { computedAt: 'desc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
  }

  /**
   * Get fact snapshot by ID
   */
  async getById(id: string) {
    const tenantId = this.tenantContext.tenantId;

    return this.prisma.tradingReadinessFactSnapshot.findFirst({
      where: { tenantId, id },
    });
  }
}
