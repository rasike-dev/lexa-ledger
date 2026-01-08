import { useQuery } from "@tanstack/react-query";
import { fetchLoanSnapshot } from "../services/loanApi";
import { useUIStore } from "@/app/store/uiStore";

export function useLoanSnapshot(loanId: string | null) {
  const datasetMode = useUIStore((s) => s.datasetMode);

  return useQuery({
    queryKey: ["loanSnapshot", loanId, datasetMode],
    queryFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return fetchLoanSnapshot(loanId);
    },
    enabled: !!loanId,
  });
}
