import { httpClient } from "@/shared/api/httpClient";
import type { LoanObligationsResponse, PortfolioObligationsResponse } from "../types";

export async function getLoanObligations(loanId: string): Promise<LoanObligationsResponse> {
  const data = await httpClient.get<LoanObligationsResponse>(`/loans/${loanId}/obligations`);
  return data;
}

export async function getPortfolioObligations(days: number = 30, limit: number = 25): Promise<PortfolioObligationsResponse> {
  const data = await httpClient.get<PortfolioObligationsResponse>("/portfolio/obligations", {
    query: { days: String(days), limit: String(limit) },
  });
  return data;
}
