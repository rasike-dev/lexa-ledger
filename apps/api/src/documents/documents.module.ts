import { Module } from "@nestjs/common";
import { DocumentsController, DocumentVersionsController } from "./documents.controller";
import { DocumentVersionsUploadController } from "./document-versions.controller";
import { DocumentsService } from "./documents.service";

@Module({
  controllers: [DocumentsController, DocumentVersionsController, DocumentVersionsUploadController],
  providers: [DocumentsService],
})
export class DocumentsModule {}

