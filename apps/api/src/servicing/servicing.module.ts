import { Module } from "@nestjs/common";
import { ServicingController } from "./servicing.controller";
import { ServicingService } from "./servicing.service";
import { TenantModule } from "../tenant/tenant.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [TenantModule, AuditModule],
  controllers: [ServicingController],
  providers: [ServicingService],
})
export class ServicingModule {}

