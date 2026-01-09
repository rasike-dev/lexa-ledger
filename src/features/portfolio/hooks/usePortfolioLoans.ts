import { useQuery } from "@tanstack/react-query";
import { fetchPortfolioLoans } from "../services/portfolioApi";

export function usePortfolioLoans() {
  return useQuery({
    queryKey: ["portfolioLoans"],
    queryFn: fetchPortfolioLoans,
  });
}

