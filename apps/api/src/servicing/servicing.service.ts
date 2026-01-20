import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { ScenarioMode } from "@prisma/client";
import { TenantContext } from "../tenant/tenant-context";
import { AuditService } from "../audit/audit.service";
import { logApiError } from "../common/error-logger";

@Injectable()
export class ServicingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly tenantContext: TenantContext,
    private readonly auditService: AuditService,
  ) {}

  private parseScenario(v: string): ScenarioMode {
    if (v === "BASE") return ScenarioMode.BASE;
    if (v === "STRESS") return ScenarioMode.STRESS;
    throw new BadRequestException("scenario must be BASE or STRESS");
  }

  async getSummary(params: { loanId: string }) {
    const { loanId } = params;

    try {
      const loan = await this.prisma.loan.findFirst({ where: { id: loanId } });
      if (!loan) throw new NotFoundException("Loan not found");

      const scenarioRow = await this.prisma.loanScenario.findUnique({
        where: { loanId },
      });

      const scenario = scenarioRow?.mode ?? ScenarioMode.BASE;

      const covenants = await this.prisma.covenant.findMany({
        where: { loanId },
        orderBy: { createdAt: "asc" },
      });

      const results = await this.prisma.covenantTestResult.findMany({
        where: { loanId, scenario },
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
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      logApiError(error, {
        component: 'ServicingService',
        event: 'get_summary_failed',
        tenantId: this.tenantContext.tenantId,
        loanId,
      });
      throw new InternalServerErrorException("Failed to retrieve servicing summary");
    }
  }

  async setScenario(params: { loanId: string; scenario: string; req: Request }) {
    const { loanId, req } = params;

    try {
      const loan = await this.prisma.loan.findFirst({ where: { id: loanId } });
      if (!loan) throw new NotFoundException("Loan not found");

      const scenarioEnum = this.parseScenario(params.scenario);
      const scenarioStr = scenarioEnum === ScenarioMode.BASE ? "BASE" : "STRESS";

      // Check if this is an update (existing scenario) to capture old value
      const existing = await this.prisma.loanScenario.findUnique({
        where: { loanId },
      });
      const oldScenario = existing?.mode === ScenarioMode.BASE ? "BASE" : "STRESS";

      await this.prisma.loanScenario.upsert({
        where: { loanId },
        update: { mode: scenarioEnum },
        create: { loanId, mode: scenarioEnum } as any, // tenantId injected by Prisma extension
      });

      // Record audit event and enqueue job (non-critical, log failures)
      try {
        const ctx = this.auditService.actorFromRequest(req);
        await this.auditService.record({
          ...ctx,
          type: existing ? "SCENARIO_UPDATED" : "SCENARIO_CREATED",
          summary: existing
            ? `Updated servicing scenario from ${oldScenario} to ${scenarioStr} for loan ${loanId}`
            : `Created servicing scenario (${scenarioStr}) for loan ${loanId}`,
          evidenceRef: loanId,
          payload: {
            loanId,
            scenario: scenarioStr,
            ...(existing ? { oldScenario, newScenario: scenarioStr } : {}),
            reason: 'Scenario changed via UI', // Enterprise: capture "why" for compliance
          },
        });

        // Enqueue recompute job with correlation ID for tracing
        try {
          await this.queue.enqueueServicingRecompute({
            tenantId: this.tenantContext.tenantId,
            loanId,
            scenario: scenarioStr,
            correlationId: ctx.correlationId,
          });
        } catch (queueError) {
          logApiError(queueError, {
            component: 'ServicingService',
            event: 'enqueue_recompute_failed',
            tenantId: this.tenantContext.tenantId,
            loanId,
            scenario: scenarioStr,
          });
        }
      } catch (auditError) {
        logApiError(auditError, {
          component: 'ServicingService',
          event: 'audit_record_failed',
          tenantId: this.tenantContext.tenantId,
          loanId,
        });
      }

      return { loanId, scenario: scenarioStr };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      logApiError(error, {
        component: 'ServicingService',
        event: 'set_scenario_failed',
        tenantId: this.tenantContext.tenantId,
        loanId,
        scenario: params.scenario,
      });
      throw new InternalServerErrorException("Failed to set servicing scenario");
    }
  }

  async requestRecompute(params: { loanId: string; scenario?: "BASE" | "STRESS"; req: Request }) {
    const { loanId, req } = params;

    try {
      const loan = await this.prisma.loan.findFirst({ where: { id: loanId } });
      if (!loan) throw new NotFoundException("Loan not found");

      const scenarioRow = await this.prisma.loanScenario.findUnique({
        where: { loanId },
      });

      const scenarioEnum = params.scenario
        ? this.parseScenario(params.scenario)
        : (scenarioRow?.mode ?? ScenarioMode.BASE);

      const scenarioStr = scenarioEnum === ScenarioMode.BASE ? "BASE" : "STRESS";

      // Get covenant count for audit metadata (compliance context)
      const covenantCount = await this.prisma.covenant.count({
        where: { loanId },
      });

      // Record audit event and enqueue job (non-critical, log failures)
      try {
        const ctx = this.auditService.actorFromRequest(req);
        await this.auditService.record({
          ...ctx,
          type: "SERVICING_RECOMPUTE_REQUESTED",
          summary: `Requested servicing covenant recompute (${scenarioStr}) for loan ${loanId}`,
          evidenceRef: loanId,
          payload: {
            loanId,
            scenario: scenarioStr,
            covenantCount,
            source: 'ui',
            reason: 'Manual recompute requested', // Enterprise: capture "why" for compliance
          },
        });

        // Enqueue recompute job with correlation ID for tracing
        try {
          await this.queue.enqueueServicingRecompute({
            tenantId: this.tenantContext.tenantId,
            loanId,
            scenario: scenarioStr,
            correlationId: ctx.correlationId,
          });
        } catch (queueError) {
          logApiError(queueError, {
            component: 'ServicingService',
            event: 'enqueue_recompute_failed',
            tenantId: this.tenantContext.tenantId,
            loanId,
            scenario: scenarioStr,
          });
        }
      } catch (auditError) {
        logApiError(auditError, {
          component: 'ServicingService',
          event: 'audit_record_failed',
          tenantId: this.tenantContext.tenantId,
          loanId,
        });
      }

      return { ok: true, loanId, scenario: scenarioStr };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      logApiError(error, {
        component: 'ServicingService',
        event: 'request_recompute_failed',
        tenantId: this.tenantContext.tenantId,
        loanId,
        scenario: params.scenario,
      });
      throw new InternalServerErrorException("Failed to request servicing recompute");
    }
  }
}

