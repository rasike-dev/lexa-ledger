import { Module } from "@nestjs/common";
import { OriginationController } from "./origination.controller";
import { OriginationService } from "./origination.service";
import { TenantModule } from "../tenant/tenant.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [TenantModule, AuditModule],
  controllers: [OriginationController],
  providers: [OriginationService],
})
export class OriginationModule {}

