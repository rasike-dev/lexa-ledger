import { Module } from "@nestjs/common";
import { DocumentsController, DocumentVersionsController } from "./documents.controller";
import { DocumentVersionsUploadController } from "./document-versions.controller";
import { DocumentsService } from "./documents.service";
import { TenantModule } from "../tenant/tenant.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [TenantModule, AuditModule],
  controllers: [DocumentsController, DocumentVersionsController, DocumentVersionsUploadController],
  providers: [DocumentsService],
})
export class DocumentsModule {}

