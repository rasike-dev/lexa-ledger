import { useQuery } from "@tanstack/react-query";
import { fetchAuditTimeline } from "../services/mockLoanApi";

export function useAuditTimeline(loanId: string | null) {
  return useQuery({
    queryKey: ["auditTimeline", loanId],
    queryFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return fetchAuditTimeline(loanId);
    },
    enabled: !!loanId,
  });
}
