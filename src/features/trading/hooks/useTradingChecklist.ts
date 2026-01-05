import { useQuery } from "@tanstack/react-query";
import { fetchTradingChecklist } from "../services/mockTradingApi";

export function useTradingChecklist(loanId: string | null) {
  return useQuery({
    queryKey: ["tradingChecklist", loanId],
    queryFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return fetchTradingChecklist(loanId);
    },
    enabled: !!loanId,
  });
}
