/**
 * Ops Worker
 * 
 * Week 3 - Track C: Operational Intelligence
 * Step C1: Scheduled Refresh Jobs
 * 
 * Processes ops queue jobs:
 * - NIGHTLY_REFRESH_TENANT: Complete tenant refresh
 * - HOURLY_REFRESH_TENANT: Lighter-weight refresh (future)
 * 
 * For each tenant refresh:
 * 1. Recompute Portfolio facts
 * 2. Recompute Trading readiness (demo loans)
 * 3. Recompute ESG KPI facts (demo KPIs)
 * 4. Recompute Covenant facts (demo covenants)
 * 
 * Drift detection (Track B) automatically triggers explanation recompute.
 */

import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import type IORedis from 'ioredis';
import { computeFactHash } from './utils/fact-hash';
import { SERVICE_ACTOR_TYPE, SERVICE_CLIENT_ID } from './service-identity';

const OPS_QUEUE = 'ops' as const;

type NightlyRefreshTenantPayload = {
  tenantId: string;
  correlationId?: string;
  reason: 'SCHEDULED_NIGHTLY' | 'MANUAL';
};

/**
 * Start Ops Worker
 * 
 * Listens to 'ops' queue for scheduled refresh jobs
 */
export function startOpsWorker(prisma: PrismaClient, connection: IORedis) {
  const worker = new Worker(
    OPS_QUEUE,
    async (job: Job) => {
      if (job.name === 'NIGHTLY_REFRESH_TENANT') {
        return await processNightlyRefresh(job, prisma);
      }
      
      return { ignored: true, name: job.name };
    },
    { connection }
  );

  console.log(`🔄 Ops Worker listening on queue: ${OPS_QUEUE}`);
  
  return worker;
}

/**
 * Process nightly tenant refresh
 * 
 * Recomputes all facts for demo entities in tenant:
 * - Portfolio facts
 * - Trading readiness (top 3 loans)
 * - ESG KPIs (top 3 per loan)
 * - Covenants (top 3 per loan)
 */
async function processNightlyRefresh(job: Job, prisma: PrismaClient) {
  const payload = job.data as NightlyRefreshTenantPayload;
  const { tenantId, correlationId, reason } = payload;

  // Audit: Job started
  await prisma.auditEvent.create({
    data: {
      tenantId,
      actorId: null,
      actorType: SERVICE_ACTOR_TYPE,
      actorClientId: SERVICE_CLIENT_ID,
      type: 'OPS_JOB_STARTED',
      summary: `Nightly refresh started: ${reason}`,
      evidenceRef: tenantId,
      correlationId,
      payload: {
        queue: OPS_QUEUE,
        job: job.name,
        jobId: job.id,
        reason,
      },
    },
  });

  const stats = {
    portfolioRefreshed: false,
    loansRefreshed: 0,
    kpisRefreshed: 0,
    covenantsRefreshed: 0,
  };

  try {
    // 1) Portfolio facts refresh
    await refreshPortfolioFacts(prisma, tenantId, correlationId);
    stats.portfolioRefreshed = true;

    // 2) Get demo loans (top 3 by updatedAt)
    const demoLoans = await prisma.loan.findMany({
      where: { tenantId },
      take: 3,
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });

    // 3) Refresh each loan
    for (const loan of demoLoans) {
      // Trading readiness
      await refreshTradingReadiness(prisma, tenantId, loan.id, correlationId);
      stats.loansRefreshed++;

      // ESG KPIs (top 3)
      const kpis = await prisma.eSGKpi.findMany({
        where: { tenantId, loanId: loan.id },
        take: 3,
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      });

      for (const kpi of kpis) {
        await refreshEsgKpi(prisma, tenantId, loan.id, kpi.id, correlationId);
        stats.kpisRefreshed++;
      }

      // Covenants (top 3)
      const covenants = await prisma.covenant.findMany({
        where: { tenantId, loanId: loan.id },
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      for (const covenant of covenants) {
        await refreshCovenant(prisma, tenantId, loan.id, covenant.id, correlationId);
        stats.covenantsRefreshed++;
      }
    }

    // Audit: Job completed
    await prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: null,
        actorType: SERVICE_ACTOR_TYPE,
        actorClientId: SERVICE_CLIENT_ID,
        type: 'OPS_JOB_COMPLETED',
        summary: `Nightly refresh completed: ${stats.loansRefreshed} loans, ${stats.kpisRefreshed} KPIs, ${stats.covenantsRefreshed} covenants`,
        evidenceRef: tenantId,
        correlationId,
        payload: {
          queue: OPS_QUEUE,
          job: job.name,
          jobId: job.id,
          stats,
        },
      },
    });

    return { success: true, stats };
  } catch (error) {
    // Audit: Job failed
    await prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: null,
        actorType: SERVICE_ACTOR_TYPE,
        actorClientId: SERVICE_CLIENT_ID,
        type: 'OPS_JOB_FAILED',
        summary: `Nightly refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        evidenceRef: tenantId,
        correlationId,
        payload: {
          queue: OPS_QUEUE,
          job: job.name,
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
          stats,
        },
      },
    });

    throw error;
  }
}

/**
 * Refresh portfolio facts
 * 
 * Simplified version - in production, call actual PortfolioIntelligenceService
 */
async function refreshPortfolioFacts(
  prisma: PrismaClient,
  tenantId: string,
  correlationId?: string,
) {
  // Get previous snapshot for drift detection
  const prev = await prisma.portfolioRiskFactSnapshot.findFirst({
    where: { tenantId },
    orderBy: { computedAt: 'desc' },
    select: { factHash: true },
  });

  // Placeholder facts (in production, compute real aggregates)
  const factCore = {
    portfolioId: null,
    asOfDate: new Date().toISOString(),
    totals: { loans: 3, exposure: 50000000, currency: 'USD' },
    distributions: {
      readinessBands: { GREEN: 1, AMBER: 1, RED: 1 },
      covenantStatus: { COMPLIANT: 2, AT_RISK: 0, BREACH: 1 },
      esgStatus: { PASS: 2, NEEDS_VERIFICATION: 1, FAIL: 0 },
    },
    topDrivers: [],
    anomalies: [],
    factVersion: 1,
  };

  const factHash = computeFactHash(factCore);
  const drifted = !!prev?.factHash && prev.factHash !== factHash;

  // Upsert snapshot
  await prisma.portfolioRiskFactSnapshot.upsert({
    where: { factHash },
    update: {},
    create: {
      tenantId,
      portfolioId: null,
      asOfDate: new Date(),
      totals: factCore.totals,
      distributions: factCore.distributions,
      topDrivers: factCore.topDrivers,
      anomalies: factCore.anomalies,
      computedBy: 'OPS_WORKER',
      factVersion: 1,
      factHash,
      correlationId,
    },
  });

  // Drift detection audit event
  if (drifted) {
    await prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: null,
        actorType: SERVICE_ACTOR_TYPE,
        actorClientId: SERVICE_CLIENT_ID,
        type: 'FACT_DRIFT_DETECTED',
        summary: 'Portfolio risk facts changed',
        evidenceRef: 'default',
        correlationId,
        payload: {
          module: 'PORTFOLIO',
          prevFactHash: prev.factHash,
          nextFactHash: factHash,
          reason: 'Scheduled refresh detected drift',
        },
      },
    });
  }
}

/**
 * Refresh trading readiness facts
 * 
 * Simplified version - in production, call actual TradingReadinessFactsService
 */
async function refreshTradingReadiness(
  prisma: PrismaClient,
  tenantId: string,
  loanId: string,
  correlationId?: string,
) {
  // Get previous snapshot for drift detection
  const prev = await prisma.tradingReadinessFactSnapshot.findFirst({
    where: { tenantId, loanId },
    orderBy: { computedAt: 'desc' },
    select: { factHash: true },
  });

  // Placeholder facts (in production, compute real readiness)
  const factCore = {
    loanId,
    readinessScore: 75,
    readinessBand: 'AMBER',
    contributingFactors: {},
    blockingIssues: [],
    factVersion: 1,
  };

  const factHash = computeFactHash(factCore);
  const drifted = !!prev?.factHash && prev.factHash !== factHash;

  // Upsert snapshot
  await prisma.tradingReadinessFactSnapshot.upsert({
    where: { factHash },
    update: {},
    create: {
      tenantId,
      loanId,
      readinessScore: factCore.readinessScore,
      readinessBand: factCore.readinessBand as any,
      contributingFactors: factCore.contributingFactors,
      blockingIssues: factCore.blockingIssues,
      computedBy: 'OPS_WORKER',
      factVersion: 1,
      factHash,
      correlationId,
    },
  });

  // Drift detection audit event
  if (drifted) {
    await prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: null,
        actorType: SERVICE_ACTOR_TYPE,
        actorClientId: SERVICE_CLIENT_ID,
        type: 'FACT_DRIFT_DETECTED',
        summary: 'Trading readiness facts changed',
        evidenceRef: loanId,
        correlationId,
        payload: {
          module: 'TRADING',
          loanId,
          prevFactHash: prev.factHash,
          nextFactHash: factHash,
          reason: 'Scheduled refresh detected drift',
        },
      },
    });
  }
}

/**
 * Refresh ESG KPI facts
 * 
 * Simplified version - in production, call actual EsgKpiFactsService
 */
async function refreshEsgKpi(
  prisma: PrismaClient,
  tenantId: string,
  loanId: string,
  kpiId: string,
  correlationId?: string,
) {
  // Get previous snapshot for drift detection
  const prev = await prisma.esgKpiFactSnapshot.findFirst({
    where: { tenantId, loanId, kpiId },
    orderBy: { computedAt: 'desc' },
    select: { factHash: true },
  });

  // Placeholder facts
  const factCore = {
    loanId,
    kpiId,
    kpiCode: 'SCOPE2',
    kpiName: 'Scope 2 Emissions',
    status: 'NEEDS_VERIFICATION',
    score: null,
    reasonCodes: ['MISSING_VERIFICATION_EVIDENCE'],
    measurement: {},
    evidence: {},
    verification: {},
    sources: {},
    factVersion: 1,
  };

  const factHash = computeFactHash(factCore);
  const drifted = !!prev?.factHash && prev.factHash !== factHash;

  // Upsert snapshot
  await prisma.esgKpiFactSnapshot.upsert({
    where: { factHash },
    update: {},
    create: {
      tenantId,
      loanId,
      kpiId,
      kpiCode: factCore.kpiCode,
      kpiName: factCore.kpiName,
      status: factCore.status as any,
      score: factCore.score,
      reasonCodes: factCore.reasonCodes,
      measurement: factCore.measurement,
      evidence: factCore.evidence,
      verification: factCore.verification,
      sources: factCore.sources,
      computedBy: 'OPS_WORKER',
      factVersion: 1,
      factHash,
      correlationId,
    },
  });

  // Drift detection audit event
  if (drifted) {
    await prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: null,
        actorType: SERVICE_ACTOR_TYPE,
        actorClientId: SERVICE_CLIENT_ID,
        type: 'FACT_DRIFT_DETECTED',
        summary: 'ESG KPI facts changed',
        evidenceRef: loanId,
        correlationId,
        payload: {
          module: 'ESG',
          loanId,
          kpiId,
          prevFactHash: prev.factHash,
          nextFactHash: factHash,
          reason: 'Scheduled refresh detected drift',
        },
      },
    });
  }
}

/**
 * Refresh covenant facts
 * 
 * Simplified version - in production, call actual CovenantFactsService
 */
async function refreshCovenant(
  prisma: PrismaClient,
  tenantId: string,
  loanId: string,
  covenantId: string,
  correlationId?: string,
) {
  // Get previous snapshot for drift detection
  const prev = await prisma.covenantEvaluationFactSnapshot.findFirst({
    where: { tenantId, loanId, covenantId },
    orderBy: { computedAt: 'desc' },
    select: { factHash: true },
  });

  // Placeholder facts
  const factCore = {
    loanId,
    covenantId,
    covenantName: 'DSCR',
    covenantType: 'Financial',
    status: 'COMPLIANT',
    threshold: {},
    observed: {},
    breachDetail: null,
    inputSignals: {},
    sourceRefs: {},
    factVersion: 1,
  };

  const factHash = computeFactHash(factCore);
  const drifted = !!prev?.factHash && prev.factHash !== factHash;

  // Upsert snapshot
  await prisma.covenantEvaluationFactSnapshot.upsert({
    where: { factHash },
    update: {},
    create: {
      tenantId,
      loanId,
      covenantId,
      covenantName: factCore.covenantName,
      covenantType: factCore.covenantType,
      status: factCore.status as any,
      threshold: factCore.threshold,
      observed: factCore.observed,
      breachDetail: factCore.breachDetail,
      inputSignals: factCore.inputSignals,
      sourceRefs: factCore.sourceRefs,
      computedBy: 'OPS_WORKER',
      factVersion: 1,
      factHash,
      correlationId,
    },
  });

  // Drift detection audit event
  if (drifted) {
    await prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: null,
        actorType: SERVICE_ACTOR_TYPE,
        actorClientId: SERVICE_CLIENT_ID,
        type: 'FACT_DRIFT_DETECTED',
        summary: 'Covenant facts changed',
        evidenceRef: loanId,
        correlationId,
        payload: {
          module: 'SERVICING',
          loanId,
          covenantId,
          prevFactHash: prev.factHash,
          nextFactHash: factHash,
          reason: 'Scheduled refresh detected drift',
        },
      },
    });
  }
}
