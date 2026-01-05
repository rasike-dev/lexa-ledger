import { useMemo } from "react";
import { usePortfolio } from "./usePortfolio";
import { computePortfolioKpis } from "../services/mockPortfolioApi";

export function usePortfolioKpis() {
  const q = usePortfolio();
  const kpis = useMemo(() => (q.data ? computePortfolioKpis(q.data) : null), [q.data]);
  return { ...q, kpis };
}
