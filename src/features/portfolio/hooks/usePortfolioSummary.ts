import { useQuery } from "@tanstack/react-query";
import { fetchPortfolioSummary } from "../services/portfolioApi";

export function usePortfolioSummary() {
  return useQuery({
    queryKey: ["portfolioSummary"],
    queryFn: fetchPortfolioSummary,
  });
}

