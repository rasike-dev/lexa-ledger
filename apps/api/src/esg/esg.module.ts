import { Module } from "@nestjs/common";
import { EsgController } from "./esg.controller";
import { EsgService } from "./esg.service";
import { TenantModule } from "../tenant/tenant.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [TenantModule, AuditModule],
  controllers: [EsgController],
  providers: [EsgService],
})
export class EsgModule {}

