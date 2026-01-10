import { Module } from "@nestjs/common";
import { EsgController } from "./esg.controller";
import { EsgService } from "./esg.service";
import { TenantModule } from "../tenant/tenant.module";

@Module({
  imports: [TenantModule],
  controllers: [EsgController],
  providers: [EsgService],
})
export class EsgModule {}

