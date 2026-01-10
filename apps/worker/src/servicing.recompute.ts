import { Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient, ScenarioMode, CovenantStatus } from "@prisma/client";
import { SERVICE_CLIENT_ID, SERVICE_ACTOR_TYPE } from "./service-identity";

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const prisma = new PrismaClient();
const connection = new IORedis(must("REDIS_URL"), { maxRetriesPerRequest: null });

type JobData = { tenantId: string; loanId: string; scenario: "BASE" | "STRESS" };

function computeMetricValue(metric: string, scenario: "BASE" | "STRESS") {
  // deterministic v1: base is healthier, stress is worse
  const stress = scenario === "STRESS";
  switch (metric) {
    case "DSCR":
      return stress ? 1.10 : 1.32;
    case "LIQUIDITY":
      return stress ? 18000000 : 24000000;
    default:
      return stress ? 0.9 : 1.1;
  }
}

function evalStatus(operator: string, value: number, threshold: number): CovenantStatus {
  // Rule-driven evaluation
  if (operator === "GTE") return value >= threshold ? CovenantStatus.PASS : CovenantStatus.FAIL;
  if (operator === "LTE") return value <= threshold ? CovenantStatus.PASS : CovenantStatus.FAIL;
  return CovenantStatus.WARN;
}

export function startServicingRecomputeWorker() {
  new Worker<JobData>(
    "servicing.recompute",
    async (job) => {
      const { tenantId, loanId, scenario } = job.data;

      const loan = await prisma.loan.findFirst({ where: { id: loanId, tenantId } });
      if (!loan) throw new Error("Loan not found");

      const covenants = await prisma.covenant.findMany({ where: { tenantId, loanId } });

      const scenarioEnum = scenario === "BASE" ? ScenarioMode.BASE : ScenarioMode.STRESS;

      // write latest results (append history). For v1 we append.
      for (const c of covenants) {
        const value = computeMetricValue(c.metric, scenario);
        const status = evalStatus(c.operator, value, c.threshold);

        await prisma.covenantTestResult.create({
          data: {
            tenantId,
            loanId,
            covenantId: c.id,
            scenario: scenarioEnum,
            value,
            status,
            notes: `Computed via v1 rule engine (${scenario})`,
          },
        });

        await prisma.auditEvent.create({
          data: {
            tenantId,
            actorId: null, // No user for SERVICE actions
            actorType: SERVICE_ACTOR_TYPE,
            actorClientId: SERVICE_CLIENT_ID,
            type: "COVENANT_TESTED",
            summary: `Tested covenant ${c.code} (${scenario}) => ${status}`,
            payload: { loanId, covenantId: c.id, code: c.code, scenario, value, threshold: c.threshold, status },
          },
        });
      }

      await prisma.loan.update({ where: { id: loanId }, data: { lastUpdatedAt: new Date() } });

      return { covenants: covenants.length };
    },
    { connection },
  );

  // eslint-disable-next-line no-console
  console.log("🧮 Worker listening on queue: servicing.recompute");
}

