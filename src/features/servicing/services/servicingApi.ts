import { env } from "@/app/config/env";
import { useUIStore } from "@/app/store/uiStore";
import { fetchServicingSummaryHttp, setServicingScenarioHttp, requestServicingRecomputeHttp } from "./httpServicingApi";
import { fetchServicing as fetchServicingMock } from "./mockServicingApi";

// Transform mock data to match the new API structure
async function fetchServicingSummaryMock(loanId: string) {
  const mockData = await fetchServicingMock(loanId);
  const servicingScenarioByLoan = useUIStore.getState().servicingScenarioByLoan;
  const scenario = servicingScenarioByLoan[loanId] === "stress" ? "STRESS" : "BASE";

  // Transform mock data to match API structure
  return {
    loanId,
    scenario,
    lastTestedAt: new Date().toISOString(),
    covenants: mockData.covenants.map((c) => ({
      covenantId: c.id,
      code: c.code,
      title: c.name,
      threshold: c.threshold,
      unit: c.unit,
      value: scenario === "BASE" ? c.actual : c.stressActual,
      status: scenario === "BASE" ? c.status : c.stressStatus,
      testedAt: new Date().toISOString(),
      notes: null,
    })),
  };
}

export async function fetchServicingSummary(loanId: string) {
  return env.apiMode === 'mock' ? fetchServicingSummaryMock(loanId) : fetchServicingSummaryHttp(loanId);
}

export async function setServicingScenario(loanId: string, scenario: "BASE" | "STRESS") {
  if (env.apiMode === 'mock') return { loanId, scenario }; // no-op in mock
  return setServicingScenarioHttp(loanId, scenario);
}

export async function requestServicingRecompute(loanId: string, scenario?: "BASE" | "STRESS") {
  if (env.apiMode === 'mock') return { ok: true, loanId, scenario: scenario ?? "BASE" } as const;
  return requestServicingRecomputeHttp(loanId, scenario);
}

