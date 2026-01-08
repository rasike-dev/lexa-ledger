import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/app/store/uiStore";
import { fetchLoansHttp } from "../services/httpLoansApi";

export function useLoansList() {
  const demoMode = useUIStore((s) => s.demoMode);

  return useQuery({
    queryKey: ["loansList", demoMode],
    queryFn: async () => {
      // demoMode can return a small fixed list if needed later;
      // for now, still call live if demoMode is off.
      return fetchLoansHttp();
    },
    enabled: !demoMode, // optional: disable in demo mode if you want fixtures only
  });
}

