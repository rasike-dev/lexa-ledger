import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
  Body,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request } from "express";
import { DocumentsService } from "./documents.service";
import { UploadDocumentResponseDto } from "./dto/upload-document.dto";
import { CreateDocumentRequestDto, CreateDocumentResponseDto } from "./dto/create-document.dto";
import { DocumentType } from "@prisma/client";
import { Roles } from "../auth/roles.decorator";

class UploadDocumentBody {
  // optional form fields
  type?: DocumentType;
  title?: string;
}

@Controller("loans/:loanId/documents")
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Get()
  async listLoanDocuments(
    @Param("loanId") loanId: string,
  ) {
    return this.docs.listLoanDocuments({ loanId });
  }

  @Roles('DOCUMENT_SPECIALIST', 'TENANT_ADMIN')
  @Post()
  async createDocument(
    @Req() req: Request,
    @Param("loanId") loanId: string,
    @Body() body: CreateDocumentRequestDto,
  ): Promise<CreateDocumentResponseDto> {
    return this.docs.createDocumentContainer({
      loanId,
      title: body.title,
      type: body.type,
      req,
    });
  }

  @Roles('DOCUMENT_SPECIALIST', 'TENANT_ADMIN')
  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @Req() req: Request,
    @Param("loanId") loanId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentBody,
  ): Promise<UploadDocumentResponseDto> {
    return this.docs.uploadForLoan({
      loanId,
      type: body.type,
      title: body.title,
      file,
      req,
    });
  }
}

@Controller("document-versions/:documentVersionId")
export class DocumentVersionsController {
  constructor(private readonly docs: DocumentsService) {}

  @Get("clauses")
  async getClauses(
    @Param("documentVersionId") documentVersionId: string,
  ) {
    return this.docs.getClausesForVersion(documentVersionId);
  }
}
