import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LoanSnapshotDto } from "./dto/loan-snapshot.dto";

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  async getLoanSnapshot(tenantId: string, loanId: string): Promise<LoanSnapshotDto> {
    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        tenantId,
      },
    });

    if (!loan) {
      throw new NotFoundException("Loan not found");
    }

    return {
      id: loan.id,
      borrower: loan.borrower,
      agentBank: loan.agentBank,
      currency: loan.currency,
      facilityAmount: Number(loan.facilityAmount),
      marginBps: loan.marginBps,
      status: loan.status,
      esgClauses: 6,   // v1 static; becomes computed later
      covenants: 5,    // v1 static; becomes real later
      lastUpdatedAt: loan.lastUpdatedAt.toISOString(),
    };
  }

  async getAuditTimeline(tenantId: string, loanId: string) {
    const events = await this.prisma.auditEvent.findMany({
      where: {
        tenantId,
        payload: {
          path: ["loanId"],
          equals: loanId,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        actor: true,
      },
    });

    return events.map((e) => ({
      id: e.id,
      type: e.type,
      timestamp: e.createdAt.toISOString(),
      actor: e.actor?.name ?? "system",
      summary: e.summary,
      evidenceRef: e.evidenceRef ?? undefined,
    }));
  }

  async listLoans(tenantId: string) {
    const loans = await this.prisma.loan.findMany({
      where: { tenantId },
      orderBy: { lastUpdatedAt: "desc" },
    });

    return loans.map((l) => ({
      id: l.id,
      borrower: l.borrower,
      agentBank: l.agentBank,
      currency: l.currency,
      facilityAmount: Number(l.facilityAmount),
      marginBps: l.marginBps,
      status: l.status,
      lastUpdatedAt: l.lastUpdatedAt.toISOString(),
    }));
  }
}

