import { useQuery } from "@tanstack/react-query";
import { fetchLoanDocuments } from "../services/documentsListApi";

export function useLoanDocuments(loanId: string | null) {
  return useQuery({
    queryKey: ["loanDocuments", loanId],
    queryFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return fetchLoanDocuments(loanId);
    },
    enabled: !!loanId,
  });
}

