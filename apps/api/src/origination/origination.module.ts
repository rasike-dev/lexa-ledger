import { Module } from "@nestjs/common";
import { OriginationController } from "./origination.controller";
import { OriginationService } from "./origination.service";

@Module({
  controllers: [OriginationController],
  providers: [OriginationService],
})
export class OriginationModule {}

