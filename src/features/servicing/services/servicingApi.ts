// import { env } from "@/app/config/env"; // Unused
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
      code: (c as any).code || c.id,
      title: c.name,
      threshold: c.threshold,
      unit: c.unit,
      value: scenario === "BASE" ? (c as any).actual : (c as any).stressActual,
      status: scenario === "BASE" ? (c as any).status : (c as any).stressStatus,
      testedAt: new Date().toISOString(),
      notes: null,
    })),
  };
}

export async function fetchServicingSummary(loanId: string) {
  const { demoMode } = useUIStore.getState();
  return demoMode ? fetchServicingSummaryMock(loanId) : fetchServicingSummaryHttp(loanId);
}

export async function setServicingScenario(loanId: string, scenario: "BASE" | "STRESS") {
  const { demoMode } = useUIStore.getState();
  if (demoMode) return { loanId, scenario }; // no-op in mock
  return setServicingScenarioHttp(loanId, scenario);
}

export async function requestServicingRecompute(loanId: string, scenario?: "BASE" | "STRESS") {
  const { demoMode } = useUIStore.getState();
  if (demoMode) return { ok: true, loanId, scenario: scenario ?? "BASE" } as const;
  return requestServicingRecomputeHttp(loanId, scenario);
}

