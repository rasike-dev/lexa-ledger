import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { startServicingRecomputeWorker } from "./servicing.recompute";
import { startTradingRecomputeWorker } from "./trading.recompute";
import { startEsgVerifyWorker } from "./esg.verify";
import { minioStorage } from "./storage/minioStorage";

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const prisma = new PrismaClient();
const connection = new IORedis(must("REDIS_URL"), {
  maxRetriesPerRequest: null,
});

type DocumentExtractJob = {
  tenantId: string;
  loanId: string;
  documentId: string;
  documentVersionId: string;
};

new Worker<DocumentExtractJob>(
  "document.extract",
  async (job) => {
    const { tenantId, loanId, documentVersionId } = job.data;

    const dv = await prisma.documentVersion.findFirst({
      where: { id: documentVersionId, tenantId },
    });
    if (!dv) throw new Error("DocumentVersion not found");

    // idempotency
    await prisma.clause.deleteMany({
      where: { tenantId, documentVersionId },
    });

    const clauses = [
      {
        clauseRef: "1.1",
        title: "Definitions",
        text: `Extracted from ${dv.fileName} — Definitions...`,
        riskTags: ["basic"],
      },
      {
        clauseRef: "5.2",
        title: "Covenants",
        text: `Extracted from ${dv.fileName} — Covenants...`,
        riskTags: ["covenant"],
      },
      {
        clauseRef: "12.4",
        title: "Events of Default",
        text: `Extracted from ${dv.fileName} — Events of Default...`,
        riskTags: ["risk"],
      },
    ];

    await prisma.clause.createMany({
      data: clauses.map((c) => ({
        tenantId,
        documentVersionId,
        clauseRef: c.clauseRef,
        title: c.title,
        text: c.text,
        riskTags: c.riskTags,
      })),
    });

    await prisma.auditEvent.create({
      data: {
        tenantId,
        type: "CLAUSES_EXTRACTED",
        summary: `Extracted ${clauses.length} clauses`,
        evidenceRef: documentVersionId,
        payload: { loanId, documentVersionId, clauseCount: clauses.length },
      },
    });

    await prisma.loan.update({
      where: { id: loanId },
      data: { lastUpdatedAt: new Date() },
    });

    return { clauseCount: clauses.length };
  },
  { connection }
);

console.log("🧠 Worker listening on queue: document.extract");

// Start servicing recompute worker
startServicingRecomputeWorker();

// Start trading recompute worker
startTradingRecomputeWorker();

// Start ESG verify worker
startEsgVerifyWorker(minioStorage);
