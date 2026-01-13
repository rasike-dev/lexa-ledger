/**
 * AI Jobs Producer
 * 
 * Enqueues AI explanation recomputation jobs to BullMQ.
 * 
 * Week 3 - Track B: AI-Ready Architecture (Step B7)
 */

import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuditService } from '../../audit/audit.service';
import {
  AI_EXPLAIN_QUEUE,
  TradingExplainRecomputePayload,
  EsgKpiExplainRecomputePayload,
  CovenantExplainRecomputePayload,
  PortfolioRiskExplainRecomputePayload,
} from './ai-jobs.types';

@Injectable()
export class AiJobsProducer {
  constructor(
    @InjectQueue(AI_EXPLAIN_QUEUE) private readonly queue: Queue,
    private readonly audit: AuditService,
  ) {}

  /**
   * Enqueue Trading Readiness explanation recomputation
   */
  async enqueueTradingExplainRecompute(payload: TradingExplainRecomputePayload) {
    await this.queue.add('TRADING_EXPLAIN_RECOMPUTE', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 50,
      removeOnFail: 50,
    });

    await this.audit.record({
      tenantId: payload.tenantId,
      type: 'AI_JOB_ENQUEUED',
      summary: 'Trading readiness explanation job enqueued',
      evidenceRef: payload.loanId,
      actor: payload.actorUserId
        ? { type: 'USER', userId: payload.actorUserId, roles: [] }
        : { type: 'SERVICE', clientId: 'ai-jobs-producer' },
      payload: {
        queue: AI_EXPLAIN_QUEUE,
        job: 'TRADING_EXPLAIN_RECOMPUTE',
        factHash: payload.factHash,
        audience: payload.audience,
        verbosity: payload.verbosity,
      },
      correlationId: payload.correlationId,
    });
  }

  /**
   * Enqueue ESG KPI explanation recomputation
   */
  async enqueueEsgKpiExplainRecompute(payload: EsgKpiExplainRecomputePayload) {
    await this.queue.add('ESG_KPI_EXPLAIN_RECOMPUTE', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 50,
      removeOnFail: 50,
    });

    await this.audit.record({
      tenantId: payload.tenantId,
      type: 'AI_JOB_ENQUEUED',
      summary: 'ESG KPI explanation job enqueued',
      evidenceRef: payload.loanId,
      actor: payload.actorUserId
        ? { type: 'USER', userId: payload.actorUserId, roles: [] }
        : { type: 'SERVICE', clientId: 'ai-jobs-producer' },
      payload: {
        queue: AI_EXPLAIN_QUEUE,
        job: 'ESG_KPI_EXPLAIN_RECOMPUTE',
        kpiId: payload.kpiId,
        factHash: payload.factHash,
        audience: payload.audience,
        verbosity: payload.verbosity,
      },
      correlationId: payload.correlationId,
    });
  }

  /**
   * Enqueue Covenant explanation recomputation
   */
  async enqueueCovenantExplainRecompute(payload: CovenantExplainRecomputePayload) {
    await this.queue.add('COVENANT_EXPLAIN_RECOMPUTE', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 50,
      removeOnFail: 50,
    });

    await this.audit.record({
      tenantId: payload.tenantId,
      type: 'AI_JOB_ENQUEUED',
      summary: 'Covenant explanation job enqueued',
      evidenceRef: payload.loanId,
      actor: payload.actorUserId
        ? { type: 'USER', userId: payload.actorUserId, roles: [] }
        : { type: 'SERVICE', clientId: 'ai-jobs-producer' },
      payload: {
        queue: AI_EXPLAIN_QUEUE,
        job: 'COVENANT_EXPLAIN_RECOMPUTE',
        covenantId: payload.covenantId,
        factHash: payload.factHash,
        audience: payload.audience,
        verbosity: payload.verbosity,
      },
      correlationId: payload.correlationId,
    });
  }

  /**
   * Enqueue Portfolio Risk explanation recomputation
   */
  async enqueuePortfolioRiskExplainRecompute(payload: PortfolioRiskExplainRecomputePayload) {
    await this.queue.add('PORTFOLIO_RISK_EXPLAIN_RECOMPUTE', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 50,
      removeOnFail: 50,
    });

    await this.audit.record({
      tenantId: payload.tenantId,
      type: 'AI_JOB_ENQUEUED',
      summary: 'Portfolio risk explanation job enqueued',
      evidenceRef: payload.portfolioId ?? 'default',
      actor: payload.actorUserId
        ? { type: 'USER', userId: payload.actorUserId, roles: [] }
        : { type: 'SERVICE', clientId: 'ai-jobs-producer' },
      payload: {
        queue: AI_EXPLAIN_QUEUE,
        job: 'PORTFOLIO_RISK_EXPLAIN_RECOMPUTE',
        portfolioId: payload.portfolioId,
        factHash: payload.factHash,
        audience: payload.audience,
        verbosity: payload.verbosity,
      },
      correlationId: payload.correlationId,
    });
  }
}
