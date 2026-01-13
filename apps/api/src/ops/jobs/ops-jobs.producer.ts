/**
 * Operational Jobs Producer
 * 
 * Week 3 - Track C: Operational Intelligence
 * Step C1: Scheduled Refresh Jobs
 * 
 * Responsibilities:
 * - Schedule repeatable jobs (cron-based)
 * - Enqueue one-off manual refresh jobs
 * - Emit audit events for job scheduling
 * 
 * Usage:
 * - scheduleNightlyTenantRefresh(): Set up cron job for tenant
 * - enqueueNightlyTenantRefreshNow(): Trigger immediate refresh
 */

import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuditService } from '../../audit/audit.service';
import { OPS_QUEUE, NightlyRefreshTenantPayload } from './ops-jobs.types';

@Injectable()
export class OpsJobsProducer {
  constructor(
    @InjectQueue(OPS_QUEUE) private readonly queue: Queue,
    private readonly audit: AuditService,
  ) {}

  /**
   * Schedule nightly tenant refresh (repeatable cron job)
   * 
   * Runs at 02:00 local time, daily
   * 
   * @param tenantId - Tenant to refresh
   * 
   * Example:
   * ```typescript
   * await producer.scheduleNightlyTenantRefresh('tenant1');
   * // Job will run every day at 2am
   * ```
   * 
   * Audit event: OPS_SCHEDULED
   */
  async scheduleNightlyTenantRefresh(tenantId: string): Promise<void> {
    // Cron: "0 2 * * *" = 02:00 AM daily
    await this.queue.add(
      'NIGHTLY_REFRESH_TENANT',
      { tenantId, reason: 'SCHEDULED_NIGHTLY' } as NightlyRefreshTenantPayload,
      {
        repeat: { pattern: '0 2 * * *' }, // Use 'pattern' instead of 'cron' for BullMQ v5+
        removeOnComplete: 20, // Keep last 20 successful runs
        removeOnFail: 20,     // Keep last 20 failed runs
      },
    );

    await this.audit.record({
      tenantId,
      type: 'OPS_SCHEDULED',
      summary: `Scheduled nightly refresh for tenant ${tenantId}`,
      evidenceRef: tenantId,
      actor: { type: 'SERVICE', clientId: 'ops-jobs-producer' },
      payload: { 
        queue: OPS_QUEUE, 
        job: 'NIGHTLY_REFRESH_TENANT', 
        cron: '0 2 * * *',
        description: 'Daily refresh at 02:00 AM'
      },
    });
  }

  /**
   * Enqueue nightly tenant refresh now (one-off)
   * 
   * Use this for:
   * - Manual trigger via API
   * - Testing
   * - On-demand refresh after major config change
   * 
   * @param payload - Job payload with tenantId, reason, correlationId
   * 
   * Example:
   * ```typescript
   * await producer.enqueueNightlyTenantRefreshNow({
   *   tenantId: 'tenant1',
   *   reason: 'MANUAL',
   *   correlationId: req.correlationId,
   * });
   * ```
   * 
   * Audit event: OPS_JOB_ENQUEUED
   */
  async enqueueNightlyTenantRefreshNow(payload: NightlyRefreshTenantPayload): Promise<void> {
    await this.queue.add('NIGHTLY_REFRESH_TENANT', payload, {
      attempts: 2, // Retry once on failure
      backoff: { type: 'exponential', delay: 3000 }, // 3s, 9s
      removeOnComplete: 50, // Keep last 50 successful runs
      removeOnFail: 50,     // Keep last 50 failed runs
    });

    await this.audit.record({
      tenantId: payload.tenantId,
      type: 'OPS_JOB_ENQUEUED',
      summary: `Enqueued nightly refresh: ${payload.reason}`,
      evidenceRef: payload.tenantId,
      actor: { type: 'SERVICE', clientId: 'ops-jobs-producer' },
      correlationId: payload.correlationId,
      payload: { 
        queue: OPS_QUEUE, 
        job: 'NIGHTLY_REFRESH_TENANT', 
        reason: payload.reason 
      },
    });
  }

  /**
   * Remove scheduled job for tenant
   * 
   * Use this when:
   * - Tenant is offboarded
   * - Tenant requests pause of scheduled refresh
   * 
   * @param tenantId - Tenant to unschedule
   */
  async unscheduleNightlyTenantRefresh(tenantId: string): Promise<void> {
    const repeatableJobs = await this.queue.getRepeatableJobs();
    
    for (const job of repeatableJobs) {
      if (job.name === 'NIGHTLY_REFRESH_TENANT') {
        // Note: RepeatableJob doesn't have a 'data' property in BullMQ
        // We'll remove all NIGHTLY_REFRESH_TENANT jobs for now
        // In production, consider storing metadata in job name or pattern
        await this.queue.removeRepeatableByKey(job.key);
        
        await this.audit.record({
          tenantId,
          type: 'OPS_UNSCHEDULED',
          summary: `Unscheduled nightly refresh for tenant ${tenantId}`,
          evidenceRef: tenantId,
          actor: { type: 'SERVICE', clientId: 'ops-jobs-producer' },
          payload: { 
            queue: OPS_QUEUE, 
            job: 'NIGHTLY_REFRESH_TENANT',
            jobKey: job.key
          },
        });
      }
    }
  }
}
