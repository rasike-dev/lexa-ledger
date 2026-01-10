import {
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DocumentsService } from "./documents.service";
import { UploadDocumentResponseDto } from "./dto/upload-document.dto";
import { CreateDocumentRequestDto, CreateDocumentResponseDto } from "./dto/create-document.dto";
import { DocumentType } from "@prisma/client";
import { TenantContext } from "../tenant/tenant-context";

class UploadDocumentBody {
  // optional form fields
  type?: DocumentType;
  title?: string;
}

@Controller("loans/:loanId/documents")
export class DocumentsController {
  constructor(
    private readonly docs: DocumentsService,
    private readonly tenantContext: TenantContext,
  ) {}

  @Get()
  async listLoanDocuments(
    @Param("loanId") loanId: string,
  ) {
    return this.docs.listLoanDocuments({ loanId });
  }

  @Post()
  async createDocument(
    @Param("loanId") loanId: string,
    @Body() body: CreateDocumentRequestDto,
  ): Promise<CreateDocumentResponseDto> {
    return this.docs.createDocumentContainer({
      loanId,
      title: body.title,
      type: body.type,
    });
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @Headers("x-actor") actor: string | undefined,
    @Param("loanId") loanId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentBody,
  ): Promise<UploadDocumentResponseDto> {
    return this.docs.uploadForLoan({
      actorName: actor,
      loanId,
      type: body.type,
      title: body.title,
      file,
    });
  }
}

@Controller("document-versions/:documentVersionId")
export class DocumentVersionsController {
  constructor(
    private readonly docs: DocumentsService,
    private readonly tenantContext: TenantContext,
  ) {}

  @Get("clauses")
  async getClauses(
    @Param("documentVersionId") documentVersionId: string,
  ) {
    return this.docs.getClausesForVersion(documentVersionId);
  }
}
