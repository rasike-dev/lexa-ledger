import { Module } from "@nestjs/common";
import { TradingController } from "./trading.controller";
import { TradingService } from "./trading.service";
import { TenantModule } from "../tenant/tenant.module";

@Module({
  imports: [TenantModule],
  controllers: [TradingController],
  providers: [TradingService],
})
export class TradingModule {}
