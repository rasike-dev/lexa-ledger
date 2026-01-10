import { Controller, Get, Param } from "@nestjs/common";
import { LoansService } from "./loans.service";

@Controller("loans")
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  async listLoans() {
    return this.loansService.listLoans();
  }

  @Get(":loanId/snapshot")
  async getSnapshot(@Param("loanId") loanId: string) {
    return this.loansService.getLoanSnapshot(loanId);
  }

  @Get(":loanId/audit")
  async getAudit(@Param("loanId") loanId: string) {
    return this.loansService.getAuditTimeline(loanId);
  }
}

