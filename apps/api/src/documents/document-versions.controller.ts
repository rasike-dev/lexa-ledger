import { Controller, Param, Post, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request } from "express";
import { DocumentsService } from "./documents.service";
import { Roles } from "../auth/roles.decorator";

@Controller("documents")
export class DocumentVersionsUploadController {
  constructor(private readonly docs: DocumentsService) {}

  @Roles('DOCUMENT_SPECIALIST', 'TENANT_ADMIN')
  @Post(":documentId/upload-version")
  @UseInterceptors(FileInterceptor("file"))
  async uploadVersion(
    @Req() req: Request,
    @Param("documentId") documentId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.docs.uploadNewVersion({ documentId, file, req });
  }
}

