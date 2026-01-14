import { useQuery } from "@tanstack/react-query";
import { getLoanObligations } from "../services/obligationsApi";

export function useLoanObligations(loanId?: string) {
  return useQuery({
    queryKey: ["loan-obligations", loanId],
    queryFn: () => getLoanObligations(loanId!),
    enabled: !!loanId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
