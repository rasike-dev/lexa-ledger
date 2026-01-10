import { Module } from "@nestjs/common";
import { TradingController } from "./trading.controller";
import { TradingService } from "./trading.service";
import { TenantModule } from "../tenant/tenant.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [TenantModule, AuditModule],
  controllers: [TradingController],
  providers: [TradingService],
})
export class TradingModule {}
