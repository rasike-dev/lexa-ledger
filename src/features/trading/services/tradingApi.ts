import { useUIStore } from "@/app/store/uiStore";
import { fetchTradingSummaryHttp, requestTradingRecomputeHttp } from "./httpTradingApi";
import { fetchTradingSummary as fetchTradingSummaryMock } from "./mockTradingApi";

export async function fetchTradingSummary(loanId: string) {
  const { demoMode } = useUIStore.getState();
  return demoMode ? fetchTradingSummaryMock(loanId) : fetchTradingSummaryHttp(loanId);
}

export async function requestTradingRecompute(loanId: string) {
  const { demoMode } = useUIStore.getState();
  if (demoMode) return { ok: true as const, loanId };
  return requestTradingRecomputeHttp(loanId);
}

