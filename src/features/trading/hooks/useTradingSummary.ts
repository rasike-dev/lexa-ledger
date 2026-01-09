import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/app/store/uiStore";
import { fetchTradingSummary } from "../services/tradingApi";

export function useTradingSummary(loanId: string | null) {
  const demoMode = useUIStore((s) => s.demoMode);
  return useQuery({
    queryKey: ["tradingSummary", loanId, demoMode],
    queryFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return fetchTradingSummary(loanId);
    },
    enabled: !!loanId,
  });
}

