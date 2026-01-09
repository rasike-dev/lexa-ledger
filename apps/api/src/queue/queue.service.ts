import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";

export type DocumentExtractJob = {
  tenantId: string;
  loanId: string;
  documentId: string;
  documentVersionId: string;
};

export type ServicingRecomputeJob = {
  tenantId: string;
  loanId: string;
  scenario: "BASE" | "STRESS";
};

export type TradingRecomputeJob = {
  tenantId: string;
  loanId: string;
};

export type ESGVerifyJob = {
  tenantId: string;
  loanId: string;
  evidenceId: string;
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
    await this.documentExtractQueue.add("extract", job);
    return { queued: true };
  }

  async enqueueServicingRecompute(job: ServicingRecomputeJob) {
    await this.servicingRecomputeQueue.add("recompute", job, {
      attempts: 3,
      removeOnComplete: 1000,
      removeOnFail: 1000,
    });
    return { queued: true };
  }

  async enqueueTradingRecompute(job: TradingRecomputeJob) {
    await this.tradingRecomputeQueue.add("recompute", job, {
      attempts: 3,
      removeOnComplete: 1000,
      removeOnFail: 1000,
    });
    return { queued: true };
  }

  async enqueueESGVerification(job: ESGVerifyJob) {
    await this.esgVerifyQueue.add("verify", job, {
      attempts: 3,
      removeOnComplete: 1000,
      removeOnFail: 1000,
    });
    return { queued: true };
  }
}

