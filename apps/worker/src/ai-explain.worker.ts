/**
 * AI Explain Worker
 * 
 * Processes async AI explanation recomputation jobs.
 * 
 * Week 3 - Track B: AI-Ready Architecture (Step B7)
 */

import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';

// Job types (replicated from API for now)
const AI_EXPLAIN_QUEUE = 'ai-explain' as const;

type TradingExplainRecomputePayload = {
  tenantId: string;
  loanId: string;
  factHash: string;
  audience: string;
  verbosity: 'SHORT' | 'STANDARD' | 'DETAILED';
  actorUserId?: string;
  correlationId?: string;
};

type EsgKpiExplainRecomputePayload = {
  tenantId: string;
  loanId: string;
  kpiId: string;
  factHash: string;
  audience: string;
  verbosity: 'SHORT' | 'STANDARD' | 'DETAILED';
  actorUserId?: string;
  correlationId?: string;
};

type CovenantExplainRecomputePayload = {
  tenantId: string;
  loanId: string;
  covenantId: string;
  factHash: string;
  audience: string;
  verbosity: 'SHORT' | 'STANDARD' | 'DETAILED';
  actorUserId?: string;
  correlationId?: string;
};

type PortfolioRiskExplainRecomputePayload = {
  tenantId: string;
  portfolioId?: string | null;
  factHash: string;
  audience: string;
  verbosity: 'SHORT' | 'STANDARD' | 'DETAILED';
  actorUserId?: string;
  correlationId?: string;
};

export function startAiExplainWorker(prisma: PrismaClient, connection: IORedis) {
  const worker = new Worker(
    AI_EXPLAIN_QUEUE,
    async (job) => {
      if (job.name === 'TRADING_EXPLAIN_RECOMPUTE') {
        const p = job.data as TradingExplainRecomputePayload;

        // Validate required fields
        if (!p.tenantId || !p.loanId || !p.factHash) {
          throw new Error(
            `Missing required fields: tenantId=${!!p.tenantId}, loanId=${!!p.loanId}, factHash=${!!p.factHash}`
          );
        }

        // Audit: Job started
        await prisma.auditEvent.create({
          data: {
            tenantId: p.tenantId,
            actorId: null,
            actorType: 'SERVICE',
            actorClientId: 'ai-explain-worker',
            type: 'AI_JOB_STARTED',
            summary: 'Trading readiness explanation job started',
            evidenceRef: p.loanId,
            payload: {
              job: job.name,
              jobId: job.id,
              factHash: p.factHash,
            },
            correlationId: p.correlationId,
          },
        });

        // Load fact snapshot
        const facts = await prisma.tradingReadinessFactSnapshot.findUnique({
          where: { factHash: p.factHash },
        });

        if (!facts) {
          throw new Error(`Fact snapshot not found for factHash=${p.factHash}`);
        }

        // Build explainInput (same shape as API controller)
        const explainInput = {
          facts: {
            tenantId: facts.tenantId,
            loanId: facts.loanId,
            readinessScore: facts.readinessScore,
            readinessBand: facts.readinessBand,
            contributingFactors: facts.contributingFactors,
            blockingIssues: facts.blockingIssues,
            computedAt: facts.computedAt,
            computedBy: facts.computedBy,
            factVersion: facts.factVersion,
            factHash: facts.factHash,
          },
          audience: p.audience,
          verbosity: p.verbosity,
        };

        // NOTE: For true implementation, we need to import and call ExplainabilityService.explainTradingReadiness()
        // For now, we'll create a simplified version that demonstrates the pattern.
        // In a full NestJS worker setup, you'd inject the service and call it directly.
        
        // For demonstration: Log that we would generate explanation
        console.log(`[AI Worker] Would generate explanation for loan ${p.loanId}, factHash ${p.factHash}`);
        
        // TODO: Call actual ExplainabilityService.explainTradingReadiness() here
        // This requires either:
        // 1. Importing the service and its dependencies (complex)
        // 2. Making this a full NestJS worker app
        // 3. Or extracting explanation logic to a shared module

        // Audit: Job completed
        await prisma.auditEvent.create({
          data: {
            tenantId: p.tenantId,
            actorId: null,
            actorType: 'SERVICE',
            actorClientId: 'ai-explain-worker',
            type: 'AI_JOB_COMPLETED',
            summary: 'Trading readiness explanation job completed',
            evidenceRef: p.loanId,
            payload: {
              job: job.name,
              jobId: job.id,
              factHash: p.factHash,
            },
            correlationId: p.correlationId,
          },
        });

        return { success: true, loanId: p.loanId, factHash: p.factHash };
      }

      if (job.name === 'ESG_KPI_EXPLAIN_RECOMPUTE') {
        const p = job.data as EsgKpiExplainRecomputePayload;

        // Validate required fields
        if (!p.tenantId || !p.loanId || !p.kpiId || !p.factHash) {
          throw new Error(
            `Missing required fields: tenantId=${!!p.tenantId}, loanId=${!!p.loanId}, kpiId=${!!p.kpiId}, factHash=${!!p.factHash}`
          );
        }

        // Audit: Job started
        await prisma.auditEvent.create({
          data: {
            tenantId: p.tenantId,
            actorId: null,
            actorType: 'SERVICE',
            actorClientId: 'ai-explain-worker',
            type: 'AI_JOB_STARTED',
            summary: 'ESG KPI explanation job started',
            evidenceRef: p.loanId,
            payload: {
              job: job.name,
              jobId: job.id,
              kpiId: p.kpiId,
              factHash: p.factHash,
            },
            correlationId: p.correlationId,
          },
        });

        // Load ESG KPI fact snapshot
        const facts = await prisma.esgKpiFactSnapshot.findUnique({
          where: { factHash: p.factHash },
        });

        if (!facts) {
          throw new Error(`ESG KPI fact snapshot not found for factHash=${p.factHash}`);
        }

        // Build explainInput (same shape as API controller)
        const explainInput = {
          facts: {
            tenantId: facts.tenantId,
            loanId: facts.loanId,
            kpiId: facts.kpiId,
            kpiCode: facts.kpiCode,
            kpiName: facts.kpiName,
            status: facts.status,
            score: facts.score,
            reasonCodes: facts.reasonCodes,
            measurement: facts.measurement,
            evidence: facts.evidence,
            verification: facts.verification,
            sources: facts.sources,
            computedAt: facts.computedAt,
            computedBy: facts.computedBy,
            factVersion: facts.factVersion,
            factHash: facts.factHash,
          },
          audience: p.audience,
          verbosity: p.verbosity,
        };

        // For demonstration: Log that we would generate explanation
        console.log(`[AI Worker] Would generate ESG KPI explanation for loan ${p.loanId}, kpiId ${p.kpiId}, factHash ${p.factHash}`);

        // TODO: Call actual ExplainabilityService.explainEsgKpi() here

        // Audit: Job completed
        await prisma.auditEvent.create({
          data: {
            tenantId: p.tenantId,
            actorId: null,
            actorType: 'SERVICE',
            actorClientId: 'ai-explain-worker',
            type: 'AI_JOB_COMPLETED',
            summary: 'ESG KPI explanation job completed',
            evidenceRef: p.loanId,
            payload: {
              job: job.name,
              jobId: job.id,
              kpiId: p.kpiId,
              factHash: p.factHash,
            },
            correlationId: p.correlationId,
          },
        });

        return { success: true, loanId: p.loanId, kpiId: p.kpiId, factHash: p.factHash };
      }

      if (job.name === 'COVENANT_EXPLAIN_RECOMPUTE') {
        const p = job.data as CovenantExplainRecomputePayload;

        // Validate required fields
        if (!p.tenantId || !p.loanId || !p.covenantId || !p.factHash) {
          throw new Error(
            `Missing required fields: tenantId=${!!p.tenantId}, loanId=${!!p.loanId}, covenantId=${!!p.covenantId}, factHash=${!!p.factHash}`
          );
        }

        // Audit: Job started
        await prisma.auditEvent.create({
          data: {
            tenantId: p.tenantId,
            actorId: null,
            actorType: 'SERVICE',
            actorClientId: 'ai-explain-worker',
            type: 'AI_JOB_STARTED',
            summary: 'Covenant explanation job started',
            evidenceRef: p.loanId,
            payload: {
              job: job.name,
              jobId: job.id,
              covenantId: p.covenantId,
              factHash: p.factHash,
            },
            correlationId: p.correlationId,
          },
        });

        // Load Covenant fact snapshot
        const facts = await prisma.covenantEvaluationFactSnapshot.findUnique({
          where: { factHash: p.factHash },
        });

        if (!facts) {
          throw new Error(`Covenant fact snapshot not found for factHash=${p.factHash}`);
        }

        // Build explainInput with SAFETY FLAGS (critical for covenant explanations)
        const explainInput = {
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
          audience: p.audience,
          verbosity: p.verbosity,
          safety: {
            noLegalInterpretation: true,
            noNewObligations: true,
            explainFromFactsOnly: true,
          },
        };

        // For demonstration: Log that we would generate explanation (with safety flags!)
        console.log(`[AI Worker] Would generate Covenant explanation for loan ${p.loanId}, covenantId ${p.covenantId}, factHash ${p.factHash} (with safety flags: noLegalInterpretation, noNewObligations, explainFromFactsOnly)`);

        // TODO: Call actual ExplainabilityService.explainCovenant() here

        // Audit: Job completed
        await prisma.auditEvent.create({
          data: {
            tenantId: p.tenantId,
            actorId: null,
            actorType: 'SERVICE',
            actorClientId: 'ai-explain-worker',
            type: 'AI_JOB_COMPLETED',
            summary: 'Covenant explanation job completed',
            evidenceRef: p.loanId,
            payload: {
              job: job.name,
              jobId: job.id,
              covenantId: p.covenantId,
              factHash: p.factHash,
            },
            correlationId: p.correlationId,
          },
        });

        return { success: true, loanId: p.loanId, covenantId: p.covenantId, factHash: p.factHash };
      }

      if (job.name === 'PORTFOLIO_RISK_EXPLAIN_RECOMPUTE') {
        const p = job.data as PortfolioRiskExplainRecomputePayload;

        // Validate required fields
        if (!p.tenantId || !p.factHash) {
          throw new Error(
            `Missing required fields: tenantId=${!!p.tenantId}, factHash=${!!p.factHash}`
          );
        }

        const entityId = p.portfolioId ?? 'default';

        // Audit: Job started
        await prisma.auditEvent.create({
          data: {
            tenantId: p.tenantId,
            actorId: null,
            actorType: 'SERVICE',
            actorClientId: 'ai-explain-worker',
            type: 'AI_JOB_STARTED',
            summary: 'Portfolio risk explanation job started',
            evidenceRef: entityId,
            payload: {
              job: job.name,
              jobId: job.id,
              portfolioId: entityId,
              factHash: p.factHash,
            },
            correlationId: p.correlationId,
          },
        });

        // Load Portfolio fact snapshot
        const facts = await prisma.portfolioRiskFactSnapshot.findUnique({
          where: { factHash: p.factHash },
        });

        if (!facts) {
          throw new Error(`Portfolio fact snapshot not found for factHash=${p.factHash}`);
        }

        // Build explainInput (same shape as API controller)
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
          audience: p.audience,
          verbosity: p.verbosity,
        };

        // For demonstration: Log that we would generate explanation
        console.log(`[AI Worker] Would generate Portfolio Risk explanation for portfolioId ${entityId}, factHash ${p.factHash}`);

        // TODO: Call actual ExplainabilityService.explainPortfolioRisk() here

        // Audit: Job completed
        await prisma.auditEvent.create({
          data: {
            tenantId: p.tenantId,
            actorId: null,
            actorType: 'SERVICE',
            actorClientId: 'ai-explain-worker',
            type: 'AI_JOB_COMPLETED',
            summary: 'Portfolio risk explanation job completed',
            evidenceRef: entityId,
            payload: {
              job: job.name,
              jobId: job.id,
              portfolioId: entityId,
              factHash: p.factHash,
            },
            correlationId: p.correlationId,
          },
        });

        return { success: true, portfolioId: entityId, factHash: p.factHash };
      }

      // Unknown job type
      return { ignored: true, name: job.name };
    },
    { connection: connection as any }
  );

  console.log(`🤖 AI Explain Worker listening on queue: ${AI_EXPLAIN_QUEUE}`);
  
  return worker;
}
