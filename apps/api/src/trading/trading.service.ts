import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { ReadinessBand } from "@prisma/client";
import { TenantContext } from "../tenant/tenant-context";

@Injectable()
export class TradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly tenantContext: TenantContext,
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

  async requestRecompute(params: { loanId: string; actorName?: string }) {
    const { loanId } = params;

    const loan = await this.prisma.loan.findFirst({ where: { id: loanId } });
    if (!loan) throw new NotFoundException("Loan not found");

    await this.prisma.auditEvent.create({
      data: {
        type: "TRADING_RECOMPUTE_REQUESTED",
        summary: `Requested trading readiness recompute`,
        payload: { loanId },
      } as any, // tenantId injected by Prisma extension
    });

    await this.queue.enqueueTradingRecompute({ tenantId: this.tenantContext.tenantId, loanId });

    return { ok: true as const, loanId };
  }
}
