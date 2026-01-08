import { httpClient } from "@/shared/api/httpClient";
import { z } from "zod";

const DocVersionSchema = z.object({
  documentVersionId: z.string(),
  version: z.number(),
  fileName: z.string(),
  contentType: z.string(),
  uploadedAt: z.string(),
  checksum: z.string().optional(),
  fileKey: z.string(),
});

const LoanDocumentSchema = z.object({
  documentId: z.string(),
  type: z.string(),
  title: z.string(),
  createdAt: z.string(),
  latestVersion: DocVersionSchema.nullable(),
  versions: z.array(DocVersionSchema),
});

export const LoanDocumentsSchema = z.array(LoanDocumentSchema);
export type LoanDocument = z.infer<typeof LoanDocumentSchema>;
export type LoanDocumentVersion = z.infer<typeof DocVersionSchema>;

export async function fetchLoanDocumentsHttp(loanId: string): Promise<LoanDocument[]> {
  const data = await httpClient.get<unknown>(`/loans/${loanId}/documents`);
  return LoanDocumentsSchema.parse(data);
}

