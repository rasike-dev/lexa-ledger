import { useQuery } from "@tanstack/react-query";
import { fetchEsgSummary } from "../services/esgApi";

export function useEsgSummary(loanId: string | null) {
  return useQuery({
    queryKey: ["esgSummary", loanId],
    queryFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return fetchEsgSummary(loanId);
    },
    enabled: !!loanId,
  });
}

