import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setServicingScenario } from "../services/servicingApi";
import { useUIStore } from "@/app/store/uiStore";

export function useSetServicingScenario(loanId: string | null) {
  const qc = useQueryClient();
  const setServicingScenarioLocal = useUIStore((s) => s.setServicingScenario);
  const demoMode = useUIStore((s) => s.demoMode);

  return useMutation({
    mutationFn: async (scenario: "BASE" | "STRESS") => {
      if (!loanId) throw new Error("No loanId");
      return setServicingScenario(loanId, scenario);
    },
    onSuccess: async (res) => {
      // keep local view aligned
      setServicingScenarioLocal(res.loanId, res.scenario === "BASE" ? "base" : "stress");
      await qc.invalidateQueries({ queryKey: ["servicingSummary", res.loanId, demoMode] });
    },
  });
}

