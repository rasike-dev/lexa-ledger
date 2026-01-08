import { httpClient } from "@/shared/api/httpClient";

export type CreateDocumentRequest = {
  title: string;
  type?: string; // "FACILITY_AGREEMENT" | "AMENDMENT" | "OTHER"
};

export type CreateDocumentResponse = {
  documentId: string;
};

export async function createDocumentContainerHttp(loanId: string, body: CreateDocumentRequest) {
  return httpClient.post<CreateDocumentResponse>(`/loans/${loanId}/documents`, body);
}

export type UploadVersionResponse = {
  documentId: string;
  documentVersionId: string;
  fileKey: string;
};

export async function uploadDocumentVersionHttp(documentId: string, file: File) {
  const form = new FormData();
  form.append("file", file);

  // IMPORTANT: your httpClient must support multipart FormData (no JSON headers forced)
  return httpClient.postForm<UploadVersionResponse>(`/documents/${documentId}/upload-version`, form);
}

