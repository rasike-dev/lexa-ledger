import { env } from "@/app/config/env";
import { fetchTradingSummaryHttp, requestTradingRecomputeHttp } from "./httpTradingApi";
import { fetchTradingSummary as fetchTradingSummaryMock } from "./mockTradingApi";

export async function fetchTradingSummary(loanId: string) {
  return env.apiMode === 'mock' ? fetchTradingSummaryMock(loanId) : fetchTradingSummaryHttp(loanId);
}

export async function requestTradingRecompute(loanId: string) {
  if (env.apiMode === 'mock') return { ok: true as const, loanId };
  return requestTradingRecomputeHttp(loanId);
}

