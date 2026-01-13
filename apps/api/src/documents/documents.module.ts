import { Module } from "@nestjs/common";
import { DocumentsController, DocumentVersionsController } from "./documents.controller";
import { DocumentVersionsUploadController } from "./document-versions.controller";
import { DocumentsService } from "./documents.service";
import { TenantModule } from "../tenant/tenant.module";
import { AuditModule } from "../audit/audit.module";
import { OpsModule } from "../ops/ops.module"; // C2: Impact detection

@Module({
  imports: [TenantModule, AuditModule, OpsModule], // C2: Import OpsModule for ImpactService
  controllers: [DocumentsController, DocumentVersionsController, DocumentVersionsUploadController],
  providers: [DocumentsService],
})
export class DocumentsModule {}

