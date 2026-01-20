import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";

export type DocumentExtractJob = {
  tenantId: string;
  loanId: string;
  documentId: string;
  documentVersionId: string;
  correlationId?: string | null;
};

export type ServicingRecomputeJob = {
  tenantId: string;
  loanId: string;
  scenario: "BASE" | "STRESS";
  correlationId?: string | null;
};

export type TradingRecomputeJob = {
  tenantId: string;
  loanId: string;
  correlationId?: string | null;
};

export type ESGVerifyJob = {
  tenantId: string;
  loanId: string;
  evidenceId: string;
  correlationId?: string | null;
};

@Injectable()
export class QueueService {
  private readonly documentExtractQueue: Queue;
  private readonly servicingRecomputeQueue: Queue;
  private readonly tradingRecomputeQueue: Queue;
  private readonly esgVerifyQueue: Queue;

  constructor() {
    this.documentExtractQueue = new Queue("document.extract", {
      connection: {
        host: "localhost",
        port: 6379,
        maxRetriesPerRequest: null,
      },
    });

    this.servicingRecomputeQueue = new Queue("servicing.recompute", {
      connection: {
        host: "localhost",
        port: 6379,
        maxRetriesPerRequest: null,
      },
    });

    this.tradingRecomputeQueue = new Queue("trading.recompute", {
      connection: {
        host: "localhost",
        port: 6379,
        maxRetriesPerRequest: null,
      },
    });

    this.esgVerifyQueue = new Queue("esg.verify", {
      connection: {
        host: "localhost",
        port: 6379,
        maxRetriesPerRequest: null,
      },
    });
  }

  async enqueueDocumentExtraction(job: DocumentExtractJob) {
    await this.documentExtractQueue.add("extract", job, {
      attempts: 3, // Maximum 3 attempts (initial + 2 retries)
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s delays
      },
      removeOnComplete: 1000, // Keep last 1000 successful jobs
      removeOnFail: 1000, // Keep last 1000 failed jobs (after max attempts)
    });
    return { queued: true };
  }

  async enqueueServicingRecompute(job: ServicingRecomputeJob) {
    await this.servicingRecomputeQueue.add("recompute", job, {
      attempts: 3, // Maximum 3 attempts (initial + 2 retries)
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s delays
      },
      removeOnComplete: 1000,
      removeOnFail: 1000, // Keep last 1000 failed jobs (after max attempts)
    });
    return { queued: true };
  }

  async enqueueTradingRecompute(job: TradingRecomputeJob) {
    await this.tradingRecomputeQueue.add("recompute", job, {
      attempts: 3, // Maximum 3 attempts (initial + 2 retries)
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s delays
      },
      removeOnComplete: 1000,
      removeOnFail: 1000, // Keep last 1000 failed jobs (after max attempts)
    });
    return { queued: true };
  }

  async enqueueESGVerification(job: ESGVerifyJob) {
    await this.esgVerifyQueue.add("verify", job, {
      attempts: 3, // Maximum 3 attempts (initial + 2 retries)
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s delays
      },
      removeOnComplete: 1000,
      removeOnFail: 1000, // Keep last 1000 failed jobs (after max attempts)
    });
    return { queued: true };
  }
}

