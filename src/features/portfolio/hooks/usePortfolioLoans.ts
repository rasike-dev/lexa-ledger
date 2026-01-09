import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/app/store/uiStore";
import { fetchPortfolioLoans } from "../services/portfolioApi";

export function usePortfolioLoans() {
  const demoMode = useUIStore((s) => s.demoMode);
  return useQuery({
    queryKey: ["portfolioLoans", demoMode],
    queryFn: fetchPortfolioLoans,
  });
}

