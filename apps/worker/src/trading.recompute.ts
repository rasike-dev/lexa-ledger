import { Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient, ReadinessBand, TradingItemStatus, TradingChecklistItem } from "@prisma/client";
import { SERVICE_CLIENT_ID, SERVICE_ACTOR_TYPE } from "./service-identity";
import * as crypto from "crypto";

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const prisma = new PrismaClient();
const connection = new IORedis(must("REDIS_URL"), { maxRetriesPerRequest: null });

type JobData = { tenantId: string; loanId: string; correlationId?: string };

function bandFor(score: number): ReadinessBand {
  if (score >= 80) return ReadinessBand.GREEN;
  if (score >= 50) return ReadinessBand.AMBER;
  return ReadinessBand.RED;
}

/**
 * Week 3 - Track A.1: Generate Trading Readiness Fact Snapshot
 * 
 * Deterministic fact capture for AI explainability.
 * This mirrors the logic in trading-fact-snapshot.service.ts but runs in worker context.
 */
async function generateTradingFactSnapshot(params: {
  prisma: PrismaClient;
  tenantId: string;
  loanId: string;
  readinessScore: number;
  readinessBand: ReadinessBand;
  checklistItems: TradingChecklistItem[];
  correlationId?: string;
}) {
  const { prisma, tenantId, loanId, readinessScore, readinessBand, checklistItems, correlationId } = params;

  // Gather system state for contributing factors
  const documentCount = await prisma.document.count({ where: { tenantId, loanId } });
  const hasVersioning = (await prisma.documentVersion.count({ where: { tenantId } })) > 0;
  const covenantCount = await prisma.covenant.count({ where: { tenantId, loanId } });
  const hasScenarios = !!(await prisma.loanScenario.findUnique({ where: { loanId } }));
  const esgKpiCount = await prisma.eSGKpi.count({ where: { tenantId, loanId } });
  const auditEventCount = await prisma.auditEvent.count({ where: { tenantId } });

  // Calculate contributing factors (deterministic)
  const docItems = checklistItems.filter((i) => i.category === 'DOCUMENTS');
  const docDone = docItems.filter((i) => i.status === 'DONE').length;
  const documentationCompleteness = docItems.length > 0 ? docDone / docItems.length : 0;

  const servicingItems = checklistItems.filter((i) => i.category === 'SERVICING');
  const covenantCompliance = servicingItems.every((i) => i.status === 'DONE');

  let amendmentStability: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' = 'NONE';
  if (!hasVersioning) {
    amendmentStability = 'NONE';
  } else if (documentCount < 3) {
    amendmentStability = 'HIGH';
  } else if (documentCount < 6) {
    amendmentStability = 'MEDIUM';
  } else {
    amendmentStability = 'LOW';
  }

  const servicingAlerts = servicingItems.filter(
    (i) => i.status === 'OPEN' || i.status === 'BLOCKED'
  ).length;

  const esgItems = checklistItems.filter((i) => i.category === 'ESG');
  const esgDone = esgItems.filter((i) => i.status === 'DONE').length;
  const esgDisclosureCoverage = esgItems.length > 0 ? esgDone / esgItems.length : 0;

  const auditTrailCompleteness = auditEventCount > 0;

  const contributingFactors = {
    documentationCompleteness,
    covenantCompliance,
    amendmentStability,
    servicingAlerts,
    esgDisclosureCoverage,
    auditTrailCompleteness,
  };

  // Identify blocking issues (deterministic)
  const blockingIssues: string[] = [];

  checklistItems.filter((i) => i.status === 'BLOCKED').forEach((item) => {
    blockingIssues.push(`Blocked: ${item.title}`);
  });

  checklistItems.filter((i) => i.status === 'OPEN' && i.weight >= 15).forEach((item) => {
    blockingIssues.push(`Missing: ${item.title}`);
  });

  if (documentCount === 0) blockingIssues.push('No documents uploaded');
  if (covenantCount === 0) blockingIssues.push('No covenants modeled');
  if (!hasScenarios) blockingIssues.push('Servicing scenarios not configured');

  // Compute fact hash for tamper detection
  const content = JSON.stringify({
    loanId,
    readinessScore,
    readinessBand,
    contributingFactors,
    blockingIssues: blockingIssues.sort(),
    factVersion: 1,
  });
  const factHash = crypto.createHash('sha256').update(content).digest('hex');

  // Store fact snapshot (upsert by hash - immutable)
  return await prisma.tradingReadinessFactSnapshot.upsert({
    where: { factHash },
    update: {}, // Immutable: if hash exists, no update needed
    create: {
      tenantId,
      loanId,
      readinessScore,
      readinessBand,
      contributingFactors,
      blockingIssues,
      factVersion: 1,
      computedBy: 'SYSTEM',
      factHash,
      correlationId,
    },
  });
}

export function startTradingRecomputeWorker() {
  new Worker<JobData>(
    "trading.recompute",
    async (job) => {
      const { tenantId, loanId, correlationId } = job.data;

      const loan = await prisma.loan.findFirst({ where: { id: loanId, tenantId } });
      if (!loan) throw new Error("Loan not found");

      const checklist = await prisma.tradingChecklistItem.findMany({
        where: { tenantId, loanId },
      });

      // ---- Signals from system state ----
      const docs = await prisma.document.findMany({
        where: { tenantId, loanId },
        include: { versions: true },
      });

      const hasFacilityAgreement = docs.some((d) => d.type === "FACILITY_AGREEMENT" && d.versions.length > 0);
      const hasAmendmentDoc = docs.some((d) => d.type === "AMENDMENT");
      const hasAnyVersion2Plus = docs.some((d) => d.versions.some((v) => v.version >= 2));

      const covenantsCount = await prisma.covenant.count({ where: { tenantId, loanId } });
      const hasScenarios = !!(await prisma.loanScenario.findUnique({
        where: { loanId },
      }));

      const auditCounts = await prisma.auditEvent.groupBy({
        by: ["type"],
        where: {
          tenantId,
          type: { in: ["DOCUMENT_VERSION_UPLOADED", "CLAUSES_EXTRACTED", "COVENANT_TESTED"] },
        },
        _count: { type: true },
      });

      const auditMap = new Map(auditCounts.map((a) => [a.type, a._count.type]));
      const hasAuditTrailOk =
        (auditMap.get("DOCUMENT_VERSION_UPLOADED") ?? 0) > 0 &&
        (auditMap.get("CLAUSES_EXTRACTED") ?? 0) > 0 &&
        (auditMap.get("COVENANT_TESTED") ?? 0) > 0;

      // ---- Rules ----
      const updates: Array<{ id: string; status: TradingItemStatus; evidenceRef?: string | null }> = [];

      for (const item of checklist) {
        let status: TradingItemStatus = item.status;
        let evidenceRef: string | null | undefined = item.evidenceRef;

        switch (item.code) {
          case "DOCS.FACILITY_AGREEMENT":
            status = hasFacilityAgreement ? TradingItemStatus.DONE : TradingItemStatus.OPEN;
            evidenceRef = hasFacilityAgreement ? "document:type=FACILITY_AGREEMENT" : null;
            break;

          case "DOCS.AMENDMENTS_TRACKED":
            status = (hasAmendmentDoc || hasAnyVersion2Plus) ? TradingItemStatus.DONE : TradingItemStatus.OPEN;
            evidenceRef = (hasAmendmentDoc || hasAnyVersion2Plus) ? "documents:amendments_or_v2plus" : null;
            break;

          case "SERVICING.COVENANTS_MODELED":
            status = covenantsCount > 0 ? TradingItemStatus.DONE : TradingItemStatus.OPEN;
            evidenceRef = covenantsCount > 0 ? `covenants:${covenantsCount}` : null;
            break;

          case "SERVICING.SCENARIOS_READY":
            status = hasScenarios ? TradingItemStatus.DONE : TradingItemStatus.OPEN;
            evidenceRef = hasScenarios ? "loanScenario:present" : null;
            break;

          case "DATA.AUDIT_TRAIL_OK":
            status = hasAuditTrailOk ? TradingItemStatus.DONE : TradingItemStatus.OPEN;
            evidenceRef = hasAuditTrailOk ? "audit:doc+clauses+covenant_tested" : null;
            break;

          // v1: keep open until those modules are wired
          case "ESG.KPIS_PRESENT":
          case "KYC.BORROWER_VERIFIED":
          default:
            // leave as-is
            break;
        }

        updates.push({ id: item.id, status, evidenceRef });
      }

      // apply updates (transaction)
      await prisma.$transaction(
        updates.map((u) =>
          prisma.tradingChecklistItem.update({
            where: { id: u.id },
            data: { status: u.status, evidenceRef: u.evidenceRef ?? null },
          }),
        ),
      );

      // recompute after updates
      const refreshed = await prisma.tradingChecklistItem.findMany({
        where: { tenantId, loanId },
      });

      const totalWeight = refreshed.reduce((s, i) => s + i.weight, 0) || 1;
      const doneWeight = refreshed.reduce((s, i) => s + (i.status === "DONE" ? i.weight : 0), 0);

      const score = Math.round((doneWeight / totalWeight) * 100);
      const band = bandFor(score);

      const reasons = {
        doneWeight,
        totalWeight,
        doneCount: refreshed.filter((i) => i.status === "DONE").length,
        openCount: refreshed.filter((i) => i.status === "OPEN").length,
        blockedCount: refreshed.filter((i) => i.status === "BLOCKED").length,
      };

      const snap = await prisma.tradingReadinessSnapshot.create({
        data: {
          tenantId,
          loanId,
          score,
          band,
          reasons,
        },
      });

      // Week 3 - Track A.1: Generate immutable fact snapshot for AI explainability
      const factSnapshot = await generateTradingFactSnapshot({
        prisma,
        tenantId,
        loanId,
        readinessScore: score,
        readinessBand: band,
        checklistItems: refreshed,
        correlationId,
      });

      await prisma.auditEvent.create({
        data: {
          tenantId,
          actorId: null, // No user for SERVICE actions
          actorType: SERVICE_ACTOR_TYPE,
          actorClientId: SERVICE_CLIENT_ID,
          type: "TRADING_READINESS_COMPUTED",
          summary: `Trading readiness computed: ${score} (${band})`,
          payload: { 
            loanId, 
            score, 
            band, 
            snapshotId: snap.id, 
            factSnapshotId: factSnapshot.id,
            reasons 
          },
        },
      });

      await prisma.loan.update({ where: { id: loanId }, data: { lastUpdatedAt: new Date() } });

      return { score, band };
    },
    { connection: connection as any },
  );

  // eslint-disable-next-line no-console
  console.log("📈 Worker listening on queue: trading.recompute");
}

