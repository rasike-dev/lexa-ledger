import { env } from "@/app/config/env";
import { fetchClausesHttp } from "./httpDocumentsApi";

// If your mock file already has a similar function name, import it here.
import { fetchClauses as fetchClausesMock } from "./mockDocumentsApi";

export async function fetchClauses(documentVersionId: string) {
  return env.apiMode === 'mock' ? fetchClausesMock(documentVersionId) : fetchClausesHttp(documentVersionId);
}

