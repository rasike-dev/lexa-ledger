import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";

export type DocumentExtractJob = {
  tenantId: string;
  loanId: string;
  documentId: string;
  documentVersionId: string;
};

@Injectable()
export class QueueService {
  private readonly documentExtractQueue: Queue;

  constructor() {
    this.documentExtractQueue = new Queue("document.extract", {
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
}

