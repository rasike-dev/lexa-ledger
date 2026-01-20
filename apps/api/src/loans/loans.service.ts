import { Injectable, NotFoundException, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LoanSnapshotDto } from "./dto/loan-snapshot.dto";
import { logApiError } from "../common/error-logger";
import { TenantContext } from "../tenant/tenant-context";

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  async getLoanSnapshot(loanId: string): Promise<LoanSnapshotDto> {
    try {
      const loan = await this.prisma.loan.findFirst({
        where: {
          id: loanId,
        }, // tenantId auto-injected by Prisma extension
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
    } catch (error) {
      // Don't log expected exceptions
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      // Log unexpected errors
      logApiError(error, {
        component: 'LoansService',
        event: 'get_loan_snapshot_failed',
        tenantId: this.tenantContext.tenantId,
        loanId,
      });
      throw new InternalServerErrorException("Failed to retrieve loan snapshot");
    }
  }

  async getAuditTimeline(loanId: string) {
    try {
      const events = await this.prisma.auditEvent.findMany({
        where: {
          payload: {
            path: ["loanId"],
            equals: loanId,
          },
        }, // tenantId auto-injected by Prisma extension
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
    } catch (error) {
      logApiError(error, {
        component: 'LoansService',
        event: 'get_audit_timeline_failed',
        tenantId: this.tenantContext.tenantId,
        loanId,
      });
      throw new InternalServerErrorException("Failed to retrieve audit timeline");
    }
  }

  async listLoans() {
    try {
      const loans = await this.prisma.loan.findMany({
        where: {}, // tenantId auto-injected by Prisma extension
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
    } catch (error) {
      logApiError(error, {
        component: 'LoansService',
        event: 'list_loans_failed',
        tenantId: this.tenantContext.tenantId,
      });
      throw new InternalServerErrorException("Failed to retrieve loans");
    }
  }
}

