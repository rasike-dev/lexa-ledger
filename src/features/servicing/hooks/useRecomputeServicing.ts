import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestServicingRecompute } from "../services/servicingApi";
import { useUIStore } from "@/app/store/uiStore";

export function useRecomputeServicing(loanId: string | null) {
  const qc = useQueryClient();
  const demoMode = useUIStore((s) => s.demoMode);

  return useMutation({
    mutationFn: async (scenario?: "BASE" | "STRESS") => {
      if (!loanId) throw new Error("No loanId");
      return requestServicingRecompute(loanId, scenario);
    },
    onSuccess: async (res) => {
      // Refresh summary after a short delay to allow worker to process
      setTimeout(async () => {
        await qc.invalidateQueries({ queryKey: ["servicingSummary", res.loanId, demoMode] });
      }, 2000);
    },
  });
}

