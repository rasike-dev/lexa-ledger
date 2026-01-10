import { BadRequestException, Injectable } from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { IngestLoanRequestDto } from "./dto/ingest-loan.dto";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class OriginationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async ingestLoan(req: Request, dto: IngestLoanRequestDto) {
    // Minimal validation (Week 1). Week 2 we'll use class-validator globally.
    if (!dto.borrower?.trim()) throw new BadRequestException("borrower is required");
    if (!dto.agentBank?.trim()) throw new BadRequestException("agentBank is required");
    if (!dto.currency?.trim()) throw new BadRequestException("currency is required");
    if (!Number.isFinite(dto.facilityAmount) || dto.facilityAmount <= 0)
      throw new BadRequestException("facilityAmount must be > 0");
    if (!Number.isInteger(dto.marginBps) || dto.marginBps < 0)
      throw new BadRequestException("marginBps must be >= 0");

    // Create loan in transaction
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

      return { loanId: loan.id, borrower: loan.borrower };
    });

    // Record audit event with enterprise-grade context (outside transaction for separation of concerns)
    const ctx = this.auditService.actorFromRequest(req);
    await this.auditService.record({
      ...ctx,
      type: "LOAN_INGESTED",
      summary: `Ingested new loan for borrower ${result.borrower}`,
      evidenceRef: result.loanId,
      payload: {
        loanId: result.loanId,
        borrower: result.borrower,
        currency: dto.currency.trim().toUpperCase(),
        facilityAmount: dto.facilityAmount,
        marginBps: dto.marginBps,
        source: "origination.ingest",
      },
    });

    return { loanId: result.loanId };
  }
}

