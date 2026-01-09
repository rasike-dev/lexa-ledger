import { useQuery } from "@tantml:react-query";
import { fetchClauses } from "../services/documentsApi";

export function useClauses(documentVersionId: string | null) {
  return useQuery({
    queryKey: ["clauses", documentVersionId],
    queryFn: async () => {
      if (!documentVersionId) throw new Error("No documentVersionId");
      return fetchClauses(documentVersionId);
    },
    enabled: !!documentVersionId,
  });
}
