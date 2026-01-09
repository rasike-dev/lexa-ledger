import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestTradingRecompute } from "../services/tradingApi";

export function useTradingRecompute(loanId: string | null) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return requestTradingRecompute(loanId);
    },
    onSuccess: async (res) => {
      // Refresh summary after worker completes; we do a quick re-fetch loop in UI
      await qc.invalidateQueries({ queryKey: ["tradingSummary", res.loanId] });
    },
  });
}

