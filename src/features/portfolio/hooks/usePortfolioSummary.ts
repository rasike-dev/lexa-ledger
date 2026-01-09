import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/app/store/uiStore";
import { fetchPortfolioSummary } from "../services/portfolioApi";

export function usePortfolioSummary() {
  const demoMode = useUIStore((s) => s.demoMode);
  return useQuery({
    queryKey: ["portfolioSummary", demoMode],
    queryFn: fetchPortfolioSummary,
  });
}

