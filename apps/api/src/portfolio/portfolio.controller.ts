import { Controller, Get } from "@nestjs/common";
import { PortfolioService } from "./portfolio.service";

@Controller("portfolio")
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get("loans")
  async loans() {
    return this.portfolio.getPortfolioLoans();
  }

  @Get("summary")
  async summary() {
    return this.portfolio.getPortfolioSummary();
  }
}

