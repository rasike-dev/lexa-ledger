import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ObligationsService } from './obligations.service';
import { AuditService } from '../audit/audit.service';
import { TenantContext } from '../tenant/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/roles.decorator';
import { LoanObligationsResponse, PortfolioObligationsResponse } from './obligations.responses';

@Controller()
export class ObligationsController {
  constructor(
    private readonly obligations: ObligationsService,
    private readonly audit: AuditService,
    private readonly tenantContext: TenantContext,
    private readonly prisma: PrismaService,
  ) {}

  @Get('/loans/:loanId/obligations')
  @Roles('TENANT_ADMIN', 'SERVICING_MANAGER', 'TRADING_ANALYST', 'COMPLIANCE_AUDITOR', 'ESG_ANALYST')
  async getLoanObligations(
    @Param('loanId') loanId: string,
    @Req() req: Request,
  ): Promise<LoanObligationsResponse> {
    const tenantId = this.tenantContext.tenantId;
    const obligations = await this.obligations.getLoanObligations({ tenantId, loanId });

    // Record audit event
    const ctx = this.audit.actorFromRequest(req);
    await this.audit.record({
      ...ctx,
      type: 'OBLIGATIONS_VIEWED',
      summary: `Viewed obligations for loan ${loanId}`,
      evidenceRef: loanId,
      payload: {
        loanId,
        obligationCount: obligations.length,
      },
    });

    return {
      loanId,
      asOf: new Date().toISOString(),
      obligations,
    };
  }

  @Get('/portfolio/obligations')
  @Roles('TENANT_ADMIN', 'SERVICING_MANAGER', 'TRADING_ANALYST', 'COMPLIANCE_AUDITOR', 'ESG_ANALYST')
  async getPortfolioObligations(
    @Query('days') days = '30',
    @Query('limit') limit = '25',
    @Req() req: Request,
  ): Promise<PortfolioObligationsResponse> {
    const tenantId = this.tenantContext.tenantId;
    const now = new Date();
    const daysNum = Math.max(1, Math.min(365, Number(days) || 30));
    const limitNum = Math.max(1, Math.min(200, Number(limit) || 25));

    // Get top loans for the tenant
    const loans = await this.prisma.loan.findMany({
      where: { tenantId },
      select: { id: true },
      take: 50,
      orderBy: { updatedAt: 'desc' },
    });

    // Get obligations for all loans
    const all = (
      await Promise.all(
        loans.map((l) => this.obligations.getLoanObligations({ tenantId, loanId: l.id, now })),
      )
    ).flat();

    // Filter by cutoff date and sort
    const cutoff = new Date(now.getTime() + daysNum * 24 * 60 * 60 * 1000);
    const filtered = all
      .filter((o) => new Date(o.dueDate) <= cutoff)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, limitNum);

    // Record audit event
    const ctx = this.audit.actorFromRequest(req);
    await this.audit.record({
      ...ctx,
      type: 'PORTFOLIO_OBLIGATIONS_VIEWED',
      summary: `Viewed portfolio obligations (${daysNum} days, ${filtered.length} found)`,
      evidenceRef: tenantId,
      payload: {
        tenantId,
        obligationCount: filtered.length,
        days: daysNum,
        limit: limitNum,
      },
    });

    return {
      asOf: now.toISOString(),
      days: daysNum,
      obligations: filtered,
    };
  }
}
