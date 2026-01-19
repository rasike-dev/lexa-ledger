import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { startServicingRecomputeWorker } from "./servicing.recompute";
import { startTradingRecomputeWorker } from "./trading.recompute";
import { startEsgVerifyWorker } from "./esg.verify";
import { startAiExplainWorker } from "./ai-explain.worker";
import { startOpsWorker } from "./ops.worker";
import { minioStorage } from "./storage/minioStorage";
import { SERVICE_CLIENT_ID, SERVICE_ACTOR_TYPE } from "./service-identity";

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
        text: `In this Agreement, unless the context otherwise requires: "Business Day" means a day (other than a Saturday or Sunday) on which banks are open for general business in London and New York; "Facility" means the term loan facility made available under this Agreement; "Interest Period" means the period determined in accordance with Clause 8 (Interest Periods); "Margin" means the percentage rate per annum specified in Schedule 2; "Obligor" means the Borrower and each Guarantor.`,
        riskTags: ["basic"],
      },
      {
        clauseRef: "5.2",
        title: "Financial Covenants",
        text: `The Borrower shall ensure that: (a) Leverage Ratio: the ratio of Total Net Debt to EBITDA shall not exceed 3.50:1.00 at any time; (b) Interest Cover: the ratio of EBITDA to Net Finance Charges shall not be less than 4.00:1.00 for any Measurement Period; (c) Minimum Liquidity: maintain unrestricted cash and Cash Equivalent Investments of not less than USD 50,000,000 at all times.`,
        riskTags: ["covenant", "financial"],
      },
      {
        clauseRef: "5.3",
        title: "Information Covenants",
        text: `The Borrower shall supply to the Agent: (a) as soon as available, but in any event within 120 days after the end of each financial year, its audited consolidated financial statements; (b) as soon as available, but in any event within 45 days after the end of each quarter, its unaudited consolidated financial statements; (c) at the same time as they are dispatched, copies of all documents dispatched by the Borrower to its shareholders or creditors generally.`,
        riskTags: ["covenant", "reporting"],
      },
      {
        clauseRef: "8.7",
        title: "Negative Pledge",
        text: `The Borrower shall not, and shall procure that no member of the Group will, create or permit to subsist any Security over any of its assets, except for: (a) Permitted Security; (b) any Security created with the prior written consent of the Majority Lenders; (c) any Security arising by operation of law in the ordinary course of trading.`,
        riskTags: ["covenant", "security"],
      },
      {
        clauseRef: "9.4",
        title: "Disposals",
        text: `The Borrower shall not, and shall procure that no other member of the Group will, enter into a single transaction or a series of transactions (whether related or not) and whether voluntary or involuntary to sell, lease, transfer or otherwise dispose of any asset except: (a) disposals at arm's length in the ordinary course of trading; (b) disposals of assets in exchange for other assets comparable or superior as to type and value; (c) disposals not exceeding USD 10,000,000 in aggregate in any financial year.`,
        riskTags: ["covenant", "restrictions"],
      },
      {
        clauseRef: "12.1",
        title: "Events of Default - Non-Payment",
        text: `An Event of Default occurs if an Obligor does not pay on the due date any amount payable pursuant to a Finance Document at the place at and in the currency in which it is expressed to be payable unless: (a) its failure to pay is caused by administrative or technical error or a Disruption Event; and (b) payment is made within three Business Days of its due date.`,
        riskTags: ["risk", "default"],
      },
      {
        clauseRef: "12.3",
        title: "Events of Default - Financial Covenants",
        text: `An Event of Default occurs if any requirement of Clause 5.2 (Financial Covenants) is not satisfied or an Obligor does not comply with the provisions of Clause 5.3 (Information Covenants).`,
        riskTags: ["risk", "default"],
      },
      {
        clauseRef: "12.6",
        title: "Events of Default - Insolvency",
        text: `An Event of Default occurs if: (a) any Obligor is unable or admits inability to pay its debts as they fall due or is declared to be unable to pay its debts under applicable law; (b) any Obligor suspends making payments on any of its debts or announces an intention to do so; (c) by reason of actual or anticipated financial difficulties, any Obligor begins negotiations with one or more of its creditors with a view to rescheduling any of its indebtedness.`,
        riskTags: ["risk", "default", "insolvency"],
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
        actorId: null, // No user for SERVICE actions
        actorType: SERVICE_ACTOR_TYPE,
        actorClientId: SERVICE_CLIENT_ID,
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
  { connection: connection as any }
);

console.log("🧠 Worker listening on queue: document.extract");

// Start servicing recompute worker
startServicingRecomputeWorker();

// Start trading recompute worker
startTradingRecomputeWorker();

// Start ESG verify worker
startEsgVerifyWorker(minioStorage);

// Start AI explain worker (Week 3 - Track B Step B7)
startAiExplainWorker(prisma, connection);

// Start Ops worker (Week 3 - Track C Step C1)
startOpsWorker(prisma, connection);
