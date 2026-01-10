import { Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient, ESGVerificationStatus } from "@prisma/client";
import { SERVICE_CLIENT_ID, SERVICE_ACTOR_TYPE } from "./service-identity";

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const prisma = new PrismaClient();
const connection = new IORedis(must("REDIS_URL"), { maxRetriesPerRequest: null });

type JobData = { tenantId: string; loanId: string; evidenceId: string };

// MinIO storage interface
type Storage = {
  getObject: (args: { key: string }) => Promise<Buffer>;
};

function looksLikePdf(contentType: string) {
  return contentType?.includes("pdf");
}

function simpleVerifyRules(input: { title: string; contentType: string; bytes: number; checksum?: string | null }) {
  // Deterministic v1:
  // - Must have checksum
  // - Must not be empty
  // - Prefer PDF for REPORT/CERT/AUDIT (but allow text)
  // - Confidence based on heuristics
  let status: ESGVerificationStatus = ESGVerificationStatus.VERIFIED;
  let confidence = 0.85;
  const notes: string[] = [];

  if (!input.checksum) {
    status = ESGVerificationStatus.NEEDS_REVIEW;
    confidence = 0.4;
    notes.push("Missing checksum");
  }

  if (input.bytes <= 0) {
    status = ESGVerificationStatus.REJECTED;
    confidence = 0.1;
    notes.push("Empty file");
  } else if (input.bytes < 20) {
    // very small evidence — probably not meaningful
    status = ESGVerificationStatus.NEEDS_REVIEW;
    confidence = Math.min(confidence, 0.55);
    notes.push("Evidence file is very small; needs manual review");
  } else {
    notes.push("File present and non-empty");
  }

  if (looksLikePdf(input.contentType)) {
    notes.push("PDF evidence detected");
    confidence = Math.min(0.95, confidence + 0.05);
  } else {
    notes.push(`Non-PDF evidence (${input.contentType}); acceptable but less standardized`);
    confidence = Math.min(confidence, 0.8);
  }

  notes.push(`Auto-check complete for "${input.title}"`);

  return { status, confidence, notes: notes.join(" | ") };
}

export function startEsgVerifyWorker(storage: Storage) {
  new Worker<JobData>(
    "esg.verify",
    async (job) => {
      const { tenantId, loanId, evidenceId } = job.data;

      const evidence = await prisma.eSGEvidence.findFirst({
        where: { id: evidenceId, tenantId, loanId },
      });
      if (!evidence) throw new Error("Evidence not found");

      // Download file (optional but good for v1 sanity checks)
      const buf = await storage.getObject({ key: evidence.fileKey });
      const bytes = buf.length;

      // Pick latest verification row (should exist as PENDING)
      const latest = await prisma.eSGVerification.findFirst({
        where: { tenantId, loanId, evidenceId },
        orderBy: { checkedAt: "desc" },
      });

      const result = simpleVerifyRules({
        title: evidence.title,
        contentType: evidence.contentType,
        bytes,
        checksum: evidence.checksum,
      });

      if (latest) {
        await prisma.eSGVerification.update({
          where: { id: latest.id },
          data: {
            status: result.status,
            confidence: result.confidence,
            notes: result.notes,
            checkedAt: new Date(),
          },
        });
      } else {
        await prisma.eSGVerification.create({
          data: {
            tenantId,
            loanId,
            evidenceId,
            status: result.status,
            confidence: result.confidence,
            notes: result.notes,
          },
        });
      }

      await prisma.auditEvent.create({
        data: {
          tenantId,
          actorId: null, // No user for SERVICE actions
          actorType: SERVICE_ACTOR_TYPE,
          actorClientId: SERVICE_CLIENT_ID,
          type: "ESG_EVIDENCE_VERIFIED",
          summary: `ESG evidence verified: ${result.status} (${Math.round(result.confidence * 100)}%)`,
          evidenceRef: evidenceId,
          payload: {
            loanId,
            evidenceId,
            status: result.status,
            confidence: result.confidence,
            notes: result.notes,
            fileKey: evidence.fileKey,
            contentType: evidence.contentType,
            bytes,
          },
        },
      });

      await prisma.loan.update({ where: { id: loanId }, data: { lastUpdatedAt: new Date() } });

      return { evidenceId, status: result.status, confidence: result.confidence };
    },
    { connection },
  );

  // eslint-disable-next-line no-console
  console.log("🧾 Worker listening on queue: esg.verify");
}

