import { useUIStore } from "@/app/store/uiStore";
import { fetchLoanDocumentsHttp } from "./httpDocumentsListApi";
import { fetchLoanDocumentsMock } from "./mockDocumentsListApi";

export async function fetchLoanDocuments(loanId: string) {
  const { demoMode } = useUIStore.getState();
  return demoMode ? fetchLoanDocumentsMock(loanId) : fetchLoanDocumentsHttp(loanId);
}

