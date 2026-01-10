import { Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient, ReadinessBand, TradingItemStatus } from "@prisma/client";
import { SERVICE_CLIENT_ID, SERVICE_ACTOR_TYPE } from "./service-identity";

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const prisma = new PrismaClient();
const connection = new IORedis(must("REDIS_URL"), { maxRetriesPerRequest: null });

type JobData = { tenantId: string; loanId: string };

function bandFor(score: number): ReadinessBand {
  if (score >= 80) return ReadinessBand.GREEN;
  if (score >= 50) return ReadinessBand.AMBER;
  return ReadinessBand.RED;
}

export function startTradingRecomputeWorker() {
  new Worker<JobData>(
    "trading.recompute",
    async (job) => {
      const { tenantId, loanId } = job.data;

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

      await prisma.auditEvent.create({
        data: {
          tenantId,
          actorId: null, // No user for SERVICE actions
          actorType: SERVICE_ACTOR_TYPE,
          actorClientId: SERVICE_CLIENT_ID,
          type: "TRADING_READINESS_COMPUTED",
          summary: `Trading readiness computed: ${score} (${band})`,
          payload: { loanId, score, band, snapshotId: snap.id, reasons },
        },
      });

      await prisma.loan.update({ where: { id: loanId }, data: { lastUpdatedAt: new Date() } });

      return { score, band };
    },
    { connection },
  );

  // eslint-disable-next-line no-console
  console.log("📈 Worker listening on queue: trading.recompute");
}

