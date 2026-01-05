import { useQuery } from "@tanstack/react-query";
import { fetchClauses } from "../services/mockDocumentsApi";

export function useClauses(loanId: string | null) {
  return useQuery({
    queryKey: ["clauses", loanId],
    queryFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return fetchClauses(loanId);
    },
    enabled: !!loanId,
  });
}
