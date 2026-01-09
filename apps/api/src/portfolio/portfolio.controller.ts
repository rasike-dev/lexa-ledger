import { Controller, Get, Headers } from "@nestjs/common";
import { PortfolioService } from "./portfolio.service";

@Controller("portfolio")
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get("loans")
  async loans(@Headers("x-tenant-id") tenantId: string) {
    return this.portfolio.getPortfolioLoans({ tenantId });
  }

  @Get("summary")
  async summary(@Headers("x-tenant-id") tenantId: string) {
    return this.portfolio.getPortfolioSummary({ tenantId });
  }
}

