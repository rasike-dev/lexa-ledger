import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { StorageModule } from "./storage/storage.module";
import { QueueModule } from "./queue/queue.module";
import { HealthModule } from "./health/health.module";
import { LoansModule } from "./loans/loans.module";
import { OriginationModule } from "./origination/origination.module";
import { DocumentsModule } from "./documents/documents.module";
import { ServicingModule } from "./servicing/servicing.module";

@Module({
  imports: [PrismaModule, StorageModule, QueueModule, HealthModule, LoansModule, OriginationModule, DocumentsModule, ServicingModule],
})
export class AppModule {}

