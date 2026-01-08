import { useQuery } from "@tanstack/react-query";
import { fetchClauses } from "../services/documentsApi";
import { useUIStore } from "@/app/store/uiStore";

export function useClauses(documentVersionId: string | null) {
  const demoMode = useUIStore((s) => s.demoMode);

  return useQuery({
    queryKey: ["clauses", documentVersionId, demoMode],
    queryFn: async () => {
      if (!documentVersionId) throw new Error("No documentVersionId");
      return fetchClauses(documentVersionId);
    },
    enabled: !!documentVersionId,
  });
}
