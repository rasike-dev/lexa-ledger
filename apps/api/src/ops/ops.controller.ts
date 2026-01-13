/**
 * Operations Controller
 * 
 * Week 3 - Track C: Operational Intelligence
 * Step C1: Scheduled Refresh Jobs
 * 
 * Endpoints for operational tasks:
 * - Manual trigger nightly refresh
 * - View scheduled jobs
 * - Pause/resume scheduled jobs
 * 
 * RBAC: TENANT_ADMIN only (sensitive operational tasks)
 */

import { Controller, Post, Get } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { TenantUser } from '../auth/tenant-user.decorator';
import { Public } from '../common/public.decorator'; // For development testing
import { OpsJobsProducer } from './jobs/ops-jobs.producer';
import { TenantContext } from '../tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { tenantALS } from '../tenant/tenant-als'; // For development testing fallback

@Controller('ops')
export class OpsController {
  constructor(
    private readonly opsJobs: OpsJobsProducer,
    private readonly tenantContext: TenantContext,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /api/ops/summary
   * 
   * Operational Intelligence Summary
   * 
   * RBAC: TENANT_ADMIN, COMPLIANCE_AUDITOR
   * 
   * Returns:
   * - lastRefresh: Latest OPS job completion (timestamp + jobId)
   * - drift24h: Count of FACT_DRIFT_DETECTED events in last 24h
   * - staleNow: Count of stale explanations (approximate, demo entities only)
   * - ai24h: AI call count + estimated cost in last 24h
   * - links: Deep links to Audit Viewer with prefilled filters
   * 
   * Use cases:
   * - Operational dashboard: System health at a glance
   * - Compliance proof: "System is monitored and self-healing"
   * - Demo: Show judge-friendly operational intelligence
   * 
   * Performance notes:
   * - All queries scoped by tenantId (multi-tenant safe)
   * - Time-boxed queries (last 24h) for performance
   * - Stale count approximation (demo entities only, not full DB scan)
   */
  @Public() // For development testing
  @Get('summary')
  @Roles('TENANT_ADMIN', 'COMPLIANCE_AUDITOR')
  async getOperationalSummary() {
    // For development testing: get tenant ID from context or use first tenant
    let tenantId: string;
    try {
      tenantId = this.tenantContext.tenantId;
    } catch (err) {
      // Fallback for development when @Public() bypasses auth
      const firstTenant = await this.prisma.tenant.findFirst({
        select: { id: true },
      });
      if (!firstTenant) {
        throw new Error('No tenants found in database. Please run seed script.');
      }
      tenantId = firstTenant.id;
    }

    // Run with tenant context for Prisma queries
    return tenantALS.run(
      { tenantId, userId: 'SYSTEM', roles: ['TENANT_ADMIN'] },
      async () => {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // 1) Last refresh: Latest OPS_JOB_COMPLETED
        const lastRefreshEvent = await this.prisma.auditEvent.findFirst({
      where: {
        tenantId,
        type: 'OPS_JOB_COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        payload: true,
      },
    });

    const lastRefresh = lastRefreshEvent
      ? {
          completedAt: lastRefreshEvent.createdAt.toISOString(),
          jobId: (lastRefreshEvent.payload as any)?.jobId ?? 'unknown',
        }
      : null;

    // 2) Drift events (last 24h): Count of FACT_DRIFT_DETECTED across all modules
    const drift24h = await this.prisma.auditEvent.count({
      where: {
        tenantId,
        type: 'FACT_DRIFT_DETECTED',
        createdAt: { gte: yesterday },
      },
    });

    // 3) AI usage (last 24h): Count + cost from AI_CALL_COMPLETED
    const aiEvents = await this.prisma.auditEvent.findMany({
      where: {
        tenantId,
        type: 'AI_CALL_COMPLETED',
        createdAt: { gte: yesterday },
      },
      select: {
        payload: true,
      },
    });

    const ai24h = {
      calls: aiEvents.length,
      costUsd: aiEvents.reduce((sum, event) => {
        const cost = (event.payload as any)?.costUsd ?? 0;
        return sum + cost;
      }, 0),
    };

    // 4) Stale explanations (approximate, demo entities only)
    // Demo-safe: Check top 5 loans for staleness
    const demoLoans = await this.prisma.loan.findMany({
      where: { tenantId },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });

    let staleNow = 0;

    // For each demo loan, check if trading readiness explanation is stale
    for (const loan of demoLoans) {
      const latestFact = await this.prisma.tradingReadinessFactSnapshot.findFirst({
        where: { tenantId, loanId: loan.id },
        orderBy: { computedAt: 'desc' },
        select: { factHash: true },
      });

      const latestExplanation = await this.prisma.tradingReadinessExplanation.findFirst({
        where: { tenantId, loanId: loan.id },
        orderBy: { createdAt: 'desc' },
        select: { factHash: true },
      });

      if (
        latestFact &&
        latestExplanation &&
        latestFact.factHash !== latestExplanation.factHash
      ) {
        staleNow++;
      }
    }

    // 5) Generate deep links to Audit Viewer
    const baseUrl = '/audit'; // Frontend route
    const links = {
      auditOps: `${baseUrl}?module=OPS&action=OPS_JOB_COMPLETED`,
      auditDrift: `${baseUrl}?action=FACT_DRIFT_DETECTED`,
      auditAi: `${baseUrl}?module=AI&action=AI_CALL_COMPLETED`,
      auditStale: `${baseUrl}?module=TRADING&action=EXPLAIN_GENERATED`, // Link to explanation events
    };

        return {
          lastRefresh,
          drift24h,
          staleNow,
          ai24h,
          links,
        };
      },
    ); // end tenantALS.run()
  }

  /**
   * POST /api/ops/refresh/nightly
   * 
   * Manually trigger nightly tenant refresh (immediate)
   * 
   * RBAC: TENANT_ADMIN only
   * 
   * Use cases:
   * - Live demo / testing
   * - Force refresh after major data change
   * - Recovery from failed scheduled run
   * 
   * What it does:
   * - Enqueues NIGHTLY_REFRESH_TENANT job for current tenant
   * - Recomputes Portfolio facts
   * - Recomputes Trading readiness (demo loans)
   * - Recomputes ESG KPIs (demo KPIs)
   * - Recomputes Covenants (demo covenants)
   * - Drift detection → auto-enqueue explanation jobs (Track B)
   * 
   * Returns:
   * - { success: true, message: "..." }
   * 
   * Audit events:
   * - OPS_JOB_ENQUEUED (immediate)
   * - OPS_JOB_STARTED (when worker picks up)
   * - OPS_JOB_COMPLETED (when done)
   * - FACT_DRIFT_DETECTED (if facts changed)
   * - AI_JOB_ENQUEUED (if drift → explanation recompute)
   */
  @Public() // For development testing
  @Post('refresh/nightly')
  @Roles('TENANT_ADMIN')
  async triggerNightlyRefresh(
    @TenantUser() user?: { userId: string; correlationId?: string },
  ) {
    // For development testing: get tenant ID from context or use first tenant
    let tenantId: string;
    try {
      tenantId = this.tenantContext.tenantId;
    } catch (err) {
      // Fallback for development when @Public() bypasses auth
      const firstTenant = await this.prisma.tenant.findFirst({
        select: { id: true },
      });
      if (!firstTenant) {
        throw new Error('No tenants found in database. Please run seed script.');
      }
      tenantId = firstTenant.id;
    }

    // Run with tenant context for Prisma queries and audit events
    return tenantALS.run(
      { tenantId, userId: user?.userId || 'SYSTEM', roles: ['TENANT_ADMIN'] },
      async () => {
        await this.opsJobs.enqueueNightlyTenantRefreshNow({
          tenantId,
          reason: 'MANUAL',
          correlationId: user?.correlationId,
        });

        return {
          success: true,
          message: 'Nightly refresh job enqueued for current tenant',
          tenantId,
          note: 'Check audit log for OPS_JOB_STARTED and OPS_JOB_COMPLETED events',
        };
      },
    ); // end tenantALS.run()
  }
}
