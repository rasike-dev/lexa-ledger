import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ScenarioMode } from "@prisma/client";

@Injectable()
export class ServicingService {
  constructor(private readonly prisma: PrismaService) {}

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

    const resultByCovenantId = new Map(results.map((r) => [r.covenantId, r]));

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

    return { loanId, scenario: scenario === ScenarioMode.BASE ? "BASE" : "STRESS" };
  }
}

