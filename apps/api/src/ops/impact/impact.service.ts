/**
 * Impact Detection Service
 * 
 * Week 3 - Track C: Operational Intelligence
 * Step C2: Downstream Impact Detection
 * 
 * Orchestrates the complete impact detection flow:
 * 1. Detect impacts from source change (using rules)
 * 2. Persist ImpactEvent (audit trail)
 * 3. Emit IMPACT_DETECTED audit event
 * 4. Enqueue recompute jobs for affected targets
 * 5. Drift detection → explanation recompute (Track B, automatic)
 * 
 * Usage:
 * ```typescript
 * await impactService.onSourceChanged({
 *   tenantId: 'tenant1',
 *   sourceType: 'DOCUMENT',
 *   sourceId: 'doc-123',
 *   sourceAction: 'UPDATED',
 *   loanId: 'loan-001',
 *   correlationId: req.correlationId,
 * });
 * ```
 * 
 * Flow:
 * Document updated → Impact detected → ImpactEvent created → Jobs enqueued → Facts recomputed → Drift detected → Explanations updated
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { detectImpactFromSource } from './impact.rules';
import { ImpactSourceAction, ImpactSourceType } from './impact.types';
import { OpsJobsProducer } from '../jobs/ops-jobs.producer';

@Injectable()
export class ImpactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly opsJobs: OpsJobsProducer,
  ) {}

  /**
   * Handle source change (Document/Amendment updated)
   * 
   * Complete impact detection and propagation flow:
   * 1. Run detection rules
   * 2. Persist ImpactEvent
   * 3. Emit IMPACT_DETECTED audit event
   * 4. Enqueue recompute jobs
   * 
   * @param params - Source change details
   * @returns Impact event ID
   * 
   * Example:
   * ```typescript
   * await impactService.onSourceChanged({
   *   tenantId: 'tenant1',
   *   correlationId: 'req-abc123',
   *   actorUserId: 'user-123',
   *   sourceType: 'DOCUMENT',
   *   sourceId: 'doc-456',
   *   sourceAction: 'UPDATED',
   *   loanId: 'loan-001',
   * });
   * ```
   * 
   * Audit trail:
   * - IMPACT_DETECTED: Impact analysis recorded
   * - OPS_JOB_ENQUEUED: Recompute job enqueued
   * - OPS_JOB_STARTED: Worker picked up job
   * - FACT_DRIFT_DETECTED: Facts changed (if drift)
   * - AI_JOB_ENQUEUED: Explanation job enqueued (if drift)
   * - OPS_JOB_COMPLETED: Recompute finished
   */
  async onSourceChanged(params: {
    tenantId: string;
    correlationId?: string;
    actorUserId?: string;
    sourceType: ImpactSourceType;
    sourceId: string;
    sourceAction: ImpactSourceAction;
    loanId: string;
  }): Promise<{ impactEventId: string }> {
    // 1) Run detection rules
    const detection = detectImpactFromSource({
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      sourceAction: params.sourceAction,
      loanId: params.loanId,
    });

    // 2) Persist ImpactEvent (audit trail for change propagation)
    const impactEvent = await this.prisma.impactEvent.create({
      data: {
        tenantId: params.tenantId,
        correlationId: params.correlationId,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        sourceAction: params.sourceAction,
        impacts: detection as any, // JSON payload
      },
    });

    // 3) Emit IMPACT_DETECTED audit event
    await this.audit.record({
      tenantId: params.tenantId,
      type: 'IMPACT_DETECTED',
      summary: `Impact detected: ${params.sourceType} ${params.sourceAction} affects ${detection.targets.length} targets`,
      evidenceRef: params.sourceId,
      actor: params.actorUserId
        ? { type: 'USER', userId: params.actorUserId, roles: [] }
        : { type: 'SERVICE', clientId: 'impact-detection-service' },
      correlationId: params.correlationId,
      payload: {
        impactEventId: impactEvent.id,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        sourceAction: params.sourceAction,
        loanId: params.loanId,
        targets: detection.targets,
        reasonCodes: detection.reasonCodes,
      },
    });

    // 4) Enqueue recompute jobs
    // V1: Simple approach - enqueue tenant-wide refresh (recomputes all demo entities)
    // V2: Optimize - enqueue specific fact recompute jobs per target
    await this.opsJobs.enqueueNightlyTenantRefreshNow({
      tenantId: params.tenantId,
      correlationId: params.correlationId,
      reason: 'MANUAL', // Manual because it's triggered by impact detection
    });

    // Note: The nightly refresh job will:
    // - Recompute Portfolio facts
    // - Recompute Trading readiness (demo loans)
    // - Recompute ESG KPIs (demo KPIs)
    // - Recompute Covenants (demo covenants)
    // - Each recompute detects drift (Track B Step B8)
    // - Drift → auto-enqueue explanation jobs (Track B)

    return { impactEventId: impactEvent.id };
  }

  /**
   * Get impact events for a loan
   * 
   * Use cases:
   * - Audit viewer: Show change propagation history
   * - Impact graph visualization: Entity relationships
   * - Debugging: Why did facts recompute?
   * 
   * @param tenantId - Tenant ID
   * @param loanId - Loan ID
   * @param take - Max results (default: 20)
   * @returns List of impact events
   */
  async getImpactEventsForLoan(
    tenantId: string,
    loanId: string,
    take = 20,
  ) {
    return this.prisma.impactEvent.findMany({
      where: {
        tenantId,
        // Note: loanId is in JSON impacts field, so we need to filter in app code
        // For now, return all events and filter client-side
        // Future: Add loanId as top-level column for efficient querying
      },
      orderBy: { detectedAt: 'desc' },
      take,
    });
  }

  /**
   * Get impact events by source
   * 
   * Use cases:
   * - Document detail page: Show what this document affected
   * - Impact traceability: Downstream effects of a change
   * 
   * @param tenantId - Tenant ID
   * @param sourceType - Source type (DOCUMENT, AMENDMENT)
   * @param sourceId - Source ID
   * @param take - Max results (default: 20)
   * @returns List of impact events
   */
  async getImpactEventsBySource(
    tenantId: string,
    sourceType: ImpactSourceType,
    sourceId: string,
    take = 20,
  ) {
    return this.prisma.impactEvent.findMany({
      where: {
        tenantId,
        sourceType,
        sourceId,
      },
      orderBy: { detectedAt: 'desc' },
      take,
    });
  }
}
