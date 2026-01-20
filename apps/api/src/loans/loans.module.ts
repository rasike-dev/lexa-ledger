import { Module } from "@nestjs/common";
import { LoansController } from "./loans.controller";
import { LoansService } from "./loans.service";
import { TenantModule } from "../tenant/tenant.module";

@Module({
  imports: [TenantModule],
  controllers: [LoansController],
  providers: [LoansService],
})
export class LoansModule {}

