import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/app/store/uiStore";
import { fetchAuditTimeline } from "../services/loanApi";

export function useAuditTimeline(loanId: string | null) {
  const demoMode = useUIStore((s) => s.demoMode);
  return useQuery({
    queryKey: ["auditTimeline", loanId, demoMode],
    queryFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return fetchAuditTimeline(loanId);
    },
    enabled: !!loanId,
  });
}
