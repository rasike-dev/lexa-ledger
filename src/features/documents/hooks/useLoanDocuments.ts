import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/app/store/uiStore";
import { fetchLoanDocuments } from "../services/documentsListApi";

export function useLoanDocuments(loanId: string | null) {
  const demoMode = useUIStore((s) => s.demoMode);

  return useQuery({
    queryKey: ["loanDocuments", loanId, demoMode],
    queryFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return fetchLoanDocuments(loanId);
    },
    enabled: !!loanId,
  });
}

