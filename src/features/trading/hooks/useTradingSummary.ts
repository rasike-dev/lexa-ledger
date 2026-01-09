import { useQuery } from "@tanstack/react-query";
import { fetchTradingSummary } from "../services/tradingApi";

export function useTradingSummary(loanId: string | null) {
  return useQuery({
    queryKey: ["tradingSummary", loanId],
    queryFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return fetchTradingSummary(loanId);
    },
    enabled: !!loanId,
  });
}

