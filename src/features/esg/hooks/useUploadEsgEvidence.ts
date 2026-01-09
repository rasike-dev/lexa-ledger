import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadEsgEvidence } from "../services/esgApi";

export function useUploadEsgEvidence(loanId: string | null) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: { title: string; type: string; kpiId?: string; file: File }) => {
      if (!loanId) throw new Error("No loanId");
      const form = new FormData();
      form.append("title", args.title);
      form.append("type", args.type);
      if (args.kpiId) form.append("kpiId", args.kpiId);
      form.append("file", args.file);
      return uploadEsgEvidence(loanId, form);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["esgSummary", loanId] });
    },
  });
}

