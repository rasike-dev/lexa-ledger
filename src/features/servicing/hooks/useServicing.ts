import { useQuery } from "@tantml:react-query";
import { fetchServicingSummary } from "../services/servicingApi";
import type { CovenantComputed, CovenantStatus, ServicingPayload } from "../types";

export function useServicing(loanId: string | null) {
  return useQuery({
    queryKey: ["servicingSummary", loanId],
    queryFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return fetchServicingSummary(loanId);
    },
    enabled: !!loanId,
  });
}

// Legacy exports for LoanTrading.tsx and TradingReport.tsx
// TODO: Update those pages to use the new API structure
function computeStatus(operator: "<=" | ">=", threshold: number, actual: number): CovenantStatus {
  const buffer = Math.abs(threshold) * 0.05;

  if (operator === "<=") {
    if (actual <= threshold) {
      return actual >= threshold - buffer ? "WATCH" : "OK";
    }
    return "BREACH_RISK";
  }

  if (actual >= threshold) {
    return actual <= threshold + buffer ? "WATCH" : "OK";
  }
  return "BREACH_RISK";
}

function computeHeadroom(operator: "<=" | ">=", threshold: number, actual: number): number {
  return operator === "<=" ? threshold - actual : actual - threshold;
}

export function enrichCovenants(
  payload: ServicingPayload,
  scenario: "base" | "stress"
): CovenantComputed[] {
  return payload.covenants.map((c) => {
    const actual = scenario === "stress" ? c.actualStress : c.actualBase;
    const status = computeStatus(c.operator, c.threshold, actual);
    const headroom = computeHeadroom(c.operator, c.threshold, actual);

    return { ...c, actual, status, headroom };
  });
}
