import { Controller, Get, Headers, Param } from "@nestjs/common";
import { LoansService } from "./loans.service";

@Controller("loans")
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  async listLoans(@Headers("x-tenant-id") tenantId: string) {
    return this.loansService.listLoans(tenantId);
  }

  @Get(":loanId/snapshot")
  async getSnapshot(
    @Headers("x-tenant-id") tenantId: string,
    @Param("loanId") loanId: string,
  ) {
    return this.loansService.getLoanSnapshot(tenantId, loanId);
  }

  @Get(":loanId/audit")
  async getAudit(
    @Headers("x-tenant-id") tenantId: string,
    @Param("loanId") loanId: string,
  ) {
    return this.loansService.getAuditTimeline(tenantId, loanId);
  }
}

