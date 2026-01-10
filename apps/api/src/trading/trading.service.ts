import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { ReadinessBand } from "@prisma/client";
import { TenantContext } from "../tenant/tenant-context";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class TradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly tenantContext: TenantContext,
    private readonly auditService: AuditService,
  ) {}

  async getSummary(params: { loanId: string }) {
    const { loanId } = params;

    const loan = await this.prisma.loan.findFirst({ where: { id: loanId } });
    if (!loan) throw new NotFoundException("Loan not found");

    const checklist = await this.prisma.tradingChecklistItem.findMany({
      where: { loanId },
      orderBy: [{ category: "asc" }, { code: "asc" }],
    });

    const latest = await this.prisma.tradingReadinessSnapshot.findFirst({
      where: { loanId },
      orderBy: { computedAt: "desc" },
    });

    return {
      loanId,
      score: latest?.score ?? 0,
      band: (latest?.band ?? ReadinessBand.RED) as any,
      computedAt: latest?.computedAt ? latest.computedAt.toISOString() : null,
      reasons: latest?.reasons ?? null,
      checklist: checklist.map((c) => ({
        id: c.id,
        code: c.code,
        title: c.title,
        category: c.category,
        weight: c.weight,
        status: c.status as any,
        evidenceRef: c.evidenceRef,
        updatedAt: c.updatedAt.toISOString(),
      })),
    };
  }

  async requestRecompute(params: { loanId: string; req: Request }) {
    const { loanId, req } = params;

    const loan = await this.prisma.loan.findFirst({ where: { id: loanId } });
    if (!loan) throw new NotFoundException("Loan not found");

    // Extract full audit context from request (enterprise-grade)
    const ctx = this.auditService.actorFromRequest(req);

    // Record audit event with complete context
    await this.auditService.record({
      ...ctx,
      type: "TRADING_RECOMPUTE_REQUESTED",
      summary: `Requested trading readiness recompute for loan ${loanId}`,
      evidenceRef: loanId,
      payload: { loanId, source: 'api' },
    });

    // Enqueue async job with correlation ID for tracing
    await this.queue.enqueueTradingRecompute({ 
      tenantId: this.tenantContext.tenantId, 
      loanId,
      correlationId: ctx.correlationId,
    });

    return { ok: true as const, loanId };
  }
}
