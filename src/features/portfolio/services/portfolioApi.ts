import { env } from "@/app/config/env";
import { fetchPortfolioLoansHttp, fetchPortfolioSummaryHttp } from "./httpPortfolioApi";
import { fetchPortfolioLoans as fetchPortfolioLoansMock, fetchPortfolioSummary as fetchPortfolioSummaryMock } from "./mockPortfolioApi";

export async function fetchPortfolioLoans() {
  return env.apiMode === 'mock' ? fetchPortfolioLoansMock() : fetchPortfolioLoansHttp();
}

export async function fetchPortfolioSummary() {
  return env.apiMode === 'mock' ? fetchPortfolioSummaryMock() : fetchPortfolioSummaryHttp();
}

