import { useUIStore } from "@/app/store/uiStore";
import { fetchPortfolioLoansHttp, fetchPortfolioSummaryHttp } from "./httpPortfolioApi";
import { fetchPortfolioLoans as fetchPortfolioLoansMock, fetchPortfolioSummary as fetchPortfolioSummaryMock } from "./mockPortfolioApi";

export async function fetchPortfolioLoans() {
  const { demoMode } = useUIStore.getState();
  return demoMode ? fetchPortfolioLoansMock() : fetchPortfolioLoansHttp();
}

export async function fetchPortfolioSummary() {
  const { demoMode } = useUIStore.getState();
  return demoMode ? fetchPortfolioSummaryMock() : fetchPortfolioSummaryHttp();
}

