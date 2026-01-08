import { Module } from "@nestjs/common";
import { ServicingController } from "./servicing.controller";
import { ServicingService } from "./servicing.service";

@Module({
  controllers: [ServicingController],
  providers: [ServicingService],
})
export class ServicingModule {}

