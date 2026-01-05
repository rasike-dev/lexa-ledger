import { useQuery } from "@tanstack/react-query";
import { fetchLoanSnapshot } from "../services/mockLoanApi";

export function useLoanSnapshot(loanId: string | null) {
  return useQuery({
    queryKey: ["loanSnapshot", loanId],
    queryFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return fetchLoanSnapshot(loanId);
    },
    enabled: !!loanId,
  });
}
