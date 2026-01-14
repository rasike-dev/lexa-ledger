import { useQuery } from "@tanstack/react-query";
import { getPortfolioObligations } from "../services/obligationsApi";

export function usePortfolioObligations(days: number = 30, limit: number = 25) {
  return useQuery({
    queryKey: ["portfolio-obligations", days, limit],
    queryFn: () => getPortfolioObligations(days, limit),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
