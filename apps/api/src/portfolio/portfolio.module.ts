import { Module } from "@nestjs/common";
import { TenantModule } from "../tenant/tenant.module";
import { PortfolioController } from "./portfolio.controller";
import { PortfolioService } from "./portfolio.service";

@Module({
  imports: [TenantModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortfolioModule {}

