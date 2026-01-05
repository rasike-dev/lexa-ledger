import { useQuery } from "@tanstack/react-query";
import { fetchPortfolio } from "../services/mockPortfolioApi";

export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: fetchPortfolio,
  });
}
