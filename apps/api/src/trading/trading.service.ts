import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { ReadinessBand } from "@prisma/client";

@Injectable()
export class TradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async getSummary(params: { tenantId: string; loanId: string }) {
    const { tenantId, loanId } = params;
    if (!tenantId) throw new BadRequestException("Missing x-tenant-id");

    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, tenantId } });
    if (!loan) throw new NotFoundException("Loan not found");

    const checklist = await this.prisma.tradingChecklistItem.findMany({
      where: { tenantId, loanId },
      orderBy: [{ category: "asc" }, { code: "asc" }],
    });

    const latest = await this.prisma.tradingReadinessSnapshot.findFirst({
      where: { tenantId, loanId },
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

  async requestRecompute(params: { tenantId: string; loanId: string; actorName?: string }) {
    const { tenantId, loanId } = params;
    if (!tenantId) throw new BadRequestException("Missing x-tenant-id");

    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, tenantId } });
    if (!loan) throw new NotFoundException("Loan not found");

    await this.prisma.auditEvent.create({
      data: {
        tenantId,
        type: "TRADING_RECOMPUTE_REQUESTED",
        summary: `Requested trading readiness recompute`,
        payload: { loanId },
      },
    });

    await this.queue.enqueueTradingRecompute({ tenantId, loanId });

    return { ok: true as const, loanId };
  }
}
