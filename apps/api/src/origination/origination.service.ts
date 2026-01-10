import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { IngestLoanRequestDto } from "./dto/ingest-loan.dto";
import { TenantContext } from "../tenant/tenant-context";

@Injectable()
export class OriginationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async ingestLoan(actorName: string | undefined, dto: IngestLoanRequestDto) {
    // Minimal validation (Week 1). Week 2 we'll use class-validator globally.
    if (!dto.borrower?.trim()) throw new BadRequestException("borrower is required");
    if (!dto.agentBank?.trim()) throw new BadRequestException("agentBank is required");
    if (!dto.currency?.trim()) throw new BadRequestException("currency is required");
    if (!Number.isFinite(dto.facilityAmount) || dto.facilityAmount <= 0)
      throw new BadRequestException("facilityAmount must be > 0");
    if (!Number.isInteger(dto.marginBps) || dto.marginBps < 0)
      throw new BadRequestException("marginBps must be >= 0");

    // Try to find a dev user by name/email (Week 1). If not found, actorId can be null.
    const actor =
      actorName
        ? await this.prisma.user.findFirst({
            where: { OR: [{ name: actorName }, { email: actorName }] },
          })
        : null;

    const result = await this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          borrower: dto.borrower.trim(),
          agentBank: dto.agentBank.trim(),
          currency: dto.currency.trim().toUpperCase(),
          facilityAmount: BigInt(Math.round(dto.facilityAmount)),
          marginBps: dto.marginBps,
          status: "Draft",
          lastUpdatedAt: new Date(),
        } as any, // tenantId injected by Prisma extension
      });

      await tx.auditEvent.create({
        data: {
          actorId: actor?.id ?? null,
          type: "LOAN_INGESTED",
          summary: `Loan ingested for borrower ${loan.borrower}`,
          payload: { loanId: loan.id, source: "origination.ingest" },
        } as any, // tenantId injected by Prisma extension
      });

      return { loanId: loan.id };
    });

    return result;
  }
}

