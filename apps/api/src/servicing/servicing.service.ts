import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { ScenarioMode } from "@prisma/client";

@Injectable()
export class ServicingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  private parseScenario(v: string): ScenarioMode {
    if (v === "BASE") return ScenarioMode.BASE;
    if (v === "STRESS") return ScenarioMode.STRESS;
    throw new BadRequestException("scenario must be BASE or STRESS");
  }

  async getSummary(params: { tenantId: string; loanId: string }) {
    const { tenantId, loanId } = params;
    if (!tenantId) throw new BadRequestException("Missing x-tenant-id");

    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, tenantId } });
    if (!loan) throw new NotFoundException("Loan not found");

    const scenarioRow = await this.prisma.loanScenario.findUnique({
      where: { loanId },
    });

    const scenario = scenarioRow?.mode ?? ScenarioMode.BASE;

    const covenants = await this.prisma.covenant.findMany({
      where: { tenantId, loanId },
      orderBy: { createdAt: "asc" },
    });

    const results = await this.prisma.covenantTestResult.findMany({
      where: { tenantId, loanId, scenario },
      orderBy: { testedAt: "desc" },
    });

    const latestTestedAt = results.length ? results[0].testedAt.toISOString() : null;

    // First occurrence per covenantId is latest due to order
    const resultByCovenantId = new Map<string, typeof results[number]>();
    for (const r of results) {
      if (!resultByCovenantId.has(r.covenantId)) {
        resultByCovenantId.set(r.covenantId, r);
      }
    }

    return {
      loanId,
      scenario: scenario === ScenarioMode.BASE ? "BASE" : "STRESS",
      lastTestedAt: latestTestedAt,
      covenants: covenants.map((c) => {
        const r = resultByCovenantId.get(c.id);
        return {
          covenantId: c.id,
          code: c.code,
          title: c.title,
          threshold: c.threshold,
          unit: c.unit,
          value: r?.value ?? NaN,
          status: (r?.status as any) ?? "WARN",
          testedAt: r?.testedAt ? r.testedAt.toISOString() : new Date(0).toISOString(),
          notes: r?.notes ?? null,
        };
      }),
    };
  }

  async setScenario(params: { tenantId: string; loanId: string; scenario: string; actorName?: string }) {
    const { tenantId, loanId } = params;
    if (!tenantId) throw new BadRequestException("Missing x-tenant-id");

    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, tenantId } });
    if (!loan) throw new NotFoundException("Loan not found");

    const scenario = this.parseScenario(params.scenario);

    await this.prisma.loanScenario.upsert({
      where: { loanId },
      update: { mode: scenario },
      create: { tenantId, loanId, mode: scenario },
    });

    const actor =
      params.actorName
        ? await this.prisma.user.findFirst({
            where: { OR: [{ name: params.actorName }, { email: params.actorName }] },
          })
        : null;

    await this.prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: actor?.id ?? null,
        type: "SERVICING_SCENARIO_SET",
        summary: `Servicing scenario set to ${scenario}`,
        payload: { loanId, scenario },
      },
    });

    // Enqueue recompute job for this scenario
    await this.queue.enqueueServicingRecompute({
      tenantId,
      loanId,
      scenario: scenario === ScenarioMode.BASE ? "BASE" : "STRESS",
    });

    return { loanId, scenario: scenario === ScenarioMode.BASE ? "BASE" : "STRESS" };
  }

  async requestRecompute(params: { tenantId: string; loanId: string; scenario?: "BASE" | "STRESS"; actorName?: string }) {
    const { tenantId, loanId } = params;
    if (!tenantId) throw new BadRequestException("Missing x-tenant-id");

    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, tenantId } });
    if (!loan) throw new NotFoundException("Loan not found");

    const scenarioRow = await this.prisma.loanScenario.findUnique({
      where: { loanId },
    });

    const scenario = params.scenario
      ? this.parseScenario(params.scenario)
      : (scenarioRow?.mode ?? ScenarioMode.BASE);

    const actor =
      params.actorName
        ? await this.prisma.user.findFirst({ where: { OR: [{ name: params.actorName }, { email: params.actorName }] } })
        : null;

    await this.prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: actor?.id ?? null,
        type: "SERVICING_RECOMPUTE_REQUESTED",
        summary: `Requested servicing recompute (${scenario})`,
        payload: { loanId, scenario },
      },
    });

    await this.queue.enqueueServicingRecompute({
      tenantId,
      loanId,
      scenario: scenario === ScenarioMode.BASE ? "BASE" : "STRESS",
    });

    return { ok: true, loanId, scenario: scenario === ScenarioMode.BASE ? "BASE" : "STRESS" };
  }
}

