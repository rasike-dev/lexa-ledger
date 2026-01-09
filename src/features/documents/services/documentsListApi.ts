import { env } from "@/app/config/env";
import { fetchLoanDocumentsHttp } from "./httpDocumentsListApi";
import { fetchLoanDocumentsMock } from "./mockDocumentsListApi";

export async function fetchLoanDocuments(loanId: string) {
  return env.apiMode === 'mock' ? fetchLoanDocumentsMock(loanId) : fetchLoanDocumentsHttp(loanId);
}

