import { DocumentType } from "@prisma/client";

export class CreateDocumentRequestDto {
  title!: string;
  type?: DocumentType;
}

export class CreateDocumentResponseDto {
  documentId!: string;
}

