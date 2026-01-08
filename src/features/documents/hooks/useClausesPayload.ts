import { useQuery } from "@tanstack/react-query";
import { fetchClausesPayload } from "../services/mockDocumentsApi";
import { useUIStore } from "@/app/store/uiStore";

export function useClausesPayload(loanId: string | null) {
  const demoMode = useUIStore((s) => s.demoMode);

  return useQuery({
    queryKey: ["clausesPayload", loanId, demoMode],
    queryFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return fetchClausesPayload(loanId);
    },
    enabled: !!loanId,
  });
}

