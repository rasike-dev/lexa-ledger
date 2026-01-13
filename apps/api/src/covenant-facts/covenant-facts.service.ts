import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { computeFactHash } from '../trading-readiness-facts/fact-hash';

/**
 * Covenant Facts Service
 * 
 * Week 3 - Track A: Explainable Intelligence
 * 
 * Computes and persists deterministic covenant evaluation snapshots.
 * 
 * SAFETY RULE:
 * ✅ AI explains evaluated covenant logic + numeric triggers
 * ❌ AI does NOT interpret raw legal text or invent obligations
 */
@Injectable()
export class CovenantFactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Compute and persist covenant evaluation fact snapshot
   * 
   * TODO: Replace placeholders with your deterministic covenant evaluator.
   * Must be derived from parsed covenant rules + known metrics (no AI).
   * 
   * B8.2: Now includes drift detection - compares with previous snapshot.
   * 
   * @param loanId - Loan identifier
   * @param covenantId - Covenant identifier
   * @param correlationId - Request correlation ID
   * @returns Snapshot + drift detection flag
   */
  async computeAndPersist(loanId: string, covenantId: string, correlationId?: string) {
    // Get tenantId from Prisma context
    const tenantId = (this.prisma as any).tenantId?.();
    if (!tenantId) {
      throw new Error('Tenant context missing for covenant fact computation');
    }

    // B8.2: Fetch previous latest snapshot for drift detection
    const prevSnapshot = await this.prisma.covenantEvaluationFactSnapshot.findFirst({
      where: { tenantId, loanId, covenantId },
      orderBy: { computedAt: 'desc' },
      select: { factHash: true, computedAt: true },
    });

    // ---- DETERMINISTIC OUTPUTS (PLACEHOLDER) ----
    // TODO: Replace with your actual covenant evaluation logic
    const covenantName = 'Debt Service Coverage Ratio';
    const covenantType = 'Financial';
    const status: 'COMPLIANT' | 'BREACH' | 'AT_RISK' | 'UNKNOWN' = 'BREACH';

    const threshold = {
      metric: 'DSCR',
      operator: '>=',
      value: 1.25,
    };

    const observed = {
      metric: 'DSCR',
      value: 1.10,
      asOf: '2025-12-31',
    };

    const breachDetail = {
      delta: -0.15,
      severity: 'MEDIUM',
      daysOutstanding: 12,
    };

    const inputSignals = {
      calculations: [
        {
          metric: 'DSCR',
          formula: 'EBITDA / DebtService',
          inputs: { EBITDA: 10.2, DebtService: 9.3 },
        },
      ],
      asOf: '2025-12-31',
    };

    const sourceRefs = {
      docIds: [],
      notes: ['Metric derived from servicing dataset v3'],
    };
    // --------------------------------------------

    const factCore = {
      loanId,
      covenantId,
      covenantName,
      covenantType,
      status,
      threshold,
      observed,
      breachDetail,
      inputSignals,
      sourceRefs,
      factVersion: 1,
    };

    const factHash = computeFactHash(factCore);

    const row = await this.prisma.covenantEvaluationFactSnapshot.upsert({
      where: { factHash },
      update: {}, // Immutable: if hash already exists, do nothing
      create: {
        tenantId,
        loanId,
        covenantId,
        covenantName,
        covenantType,
        status,
        threshold,
        observed,
        breachDetail,
        inputSignals,
        sourceRefs,
        computedBy: 'SYSTEM',
        factVersion: 1,
        factHash,
        correlationId,
      },
    });

    await this.audit.record({
      tenantId,
      type: 'COMPUTE_COVENANT_FACT_SNAPSHOT',
      summary: `Computed covenant fact snapshot for ${covenantName}`,
      evidenceRef: loanId,
      actor: { type: 'SERVICE', clientId: 'lexa-ledger-system' },
      payload: { covenantId, covenantName, status, factHash, factVersion: 1 },
      correlationId,
    });

    // B8.2: Drift detection (facts changed?)
    const drifted = !!prevSnapshot?.factHash && prevSnapshot.factHash !== factHash;

    if (drifted) {
      // Emit FACT_DRIFT_DETECTED audit event (module: SERVICING)
      await this.audit.record({
        tenantId,
        type: 'FACT_DRIFT_DETECTED',
        summary: 'Covenant fact snapshot changed - explanations may be stale',
        evidenceRef: loanId,
        actor: {
          type: 'SERVICE',
          clientId: 'covenant-facts-service',
        },
        correlationId,
        payload: {
          module: 'SERVICING',
          covenantId,
          prevFactHash: prevSnapshot.factHash,
          nextFactHash: factHash,
          prevComputedAt: prevSnapshot.computedAt,
          nextComputedAt: row.computedAt,
          reason: 'Covenant fact snapshot changed after recompute',
        },
      });
    }

    return { snapshot: row, drifted };
  }

  /**
   * Get latest fact snapshot for a covenant
   * 
   * @param loanId - Loan identifier
   * @param covenantId - Covenant identifier
   * @returns Latest fact snapshot or null
   */
  async latest(loanId: string, covenantId: string) {
    const tenantId = (this.prisma as any).tenantId?.();
    if (!tenantId) {
      throw new Error('Tenant context missing');
    }

    return this.prisma.covenantEvaluationFactSnapshot.findFirst({
      where: { tenantId, loanId, covenantId },
      orderBy: { computedAt: 'desc' },
    });
  }
}
