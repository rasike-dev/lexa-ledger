import { Controller, Headers, Param, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DocumentsService } from "./documents.service";
import { TenantContext } from "../tenant/tenant-context";
import { Roles } from "../auth/roles.decorator";

@Controller("documents")
export class DocumentVersionsUploadController {
  constructor(
    private readonly docs: DocumentsService,
    private readonly tenantContext: TenantContext,
  ) {}

  @Roles('DOCUMENT_SPECIALIST', 'TENANT_ADMIN')
  @Post(":documentId/upload-version")
  @UseInterceptors(FileInterceptor("file"))
  async uploadVersion(
    @Headers("x-actor") actor: string | undefined,
    @Param("documentId") documentId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.docs.uploadNewVersion({ actorName: actor, documentId, file });
  }
}

