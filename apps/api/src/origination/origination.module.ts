import { Module } from "@nestjs/common";
import { OriginationController } from "./origination.controller";
import { OriginationService } from "./origination.service";
import { TenantModule } from "../tenant/tenant.module";

@Module({
  imports: [TenantModule],
  controllers: [OriginationController],
  providers: [OriginationService],
})
export class OriginationModule {}

