import { Module } from "@nestjs/common";
import { ServicingController } from "./servicing.controller";
import { ServicingService } from "./servicing.service";
import { TenantModule } from "../tenant/tenant.module";

@Module({
  imports: [TenantModule],
  controllers: [ServicingController],
  providers: [ServicingService],
})
export class ServicingModule {}

