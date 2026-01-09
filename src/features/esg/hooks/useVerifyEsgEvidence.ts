import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestEsgVerifyNow } from "../services/esgApi";

export function useVerifyEsgEvidence(loanId: string | null) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (evidenceId: string) => {
      if (!loanId) throw new Error("No loanId");
      return requestEsgVerifyNow(loanId, evidenceId);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["esgSummary", loanId] });
    },
  });
}

