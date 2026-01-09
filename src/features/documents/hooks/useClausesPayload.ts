import { useQuery } from "@tanstack/react-query";
import { fetchClausesPayload } from "../services/mockDocumentsApi";

export function useClausesPayload(loanId: string | null) {
  return useQuery({
    queryKey: ["clausesPayload", loanId],
    queryFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return fetchClausesPayload(loanId);
    },
    enabled: !!loanId,
  });
}

