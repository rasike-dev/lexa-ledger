import { useQuery } from "@tanstack/react-query";
import { fetchEsg } from "../services/mockEsgApi";

export function useEsg(loanId: string | null) {
  return useQuery({
    queryKey: ["esg", loanId],
    queryFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return fetchEsg(loanId);
    },
    enabled: !!loanId,
  });
}
