import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/app/store/uiStore";
import { fetchEsgSummary } from "../services/esgApi";

export function useEsgSummary(loanId: string | null) {
  const demoMode = useUIStore((s) => s.demoMode);
  return useQuery({
    queryKey: ["esgSummary", loanId, demoMode],
    queryFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return fetchEsgSummary(loanId);
    },
    enabled: !!loanId,
  });
}

