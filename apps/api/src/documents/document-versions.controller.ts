import { Controller, Headers, Param, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DocumentsService } from "./documents.service";

@Controller("documents")
export class DocumentVersionsUploadController {
  constructor(private readonly docs: DocumentsService) {}

  @Post(":documentId/upload-version")
  @UseInterceptors(FileInterceptor("file"))
  async uploadVersion(
    @Headers("x-tenant-id") tenantId: string,
    @Headers("x-actor") actor: string | undefined,
    @Param("documentId") documentId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.docs.uploadNewVersion({ tenantId, actorName: actor, documentId, file });
  }
}

