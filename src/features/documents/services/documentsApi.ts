import { useUIStore } from "@/app/store/uiStore";
import { fetchClausesHttp } from "./httpDocumentsApi";

// If your mock file already has a similar function name, import it here.
import { fetchClauses as fetchClausesMock } from "./mockDocumentsApi";

export async function fetchClauses(documentVersionId: string) {
  const { demoMode } = useUIStore.getState();
  return demoMode ? fetchClausesMock(documentVersionId) : fetchClausesHttp(documentVersionId);
}

