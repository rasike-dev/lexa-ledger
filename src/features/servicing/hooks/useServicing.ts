import { useQuery } from "@tanstack/react-query";
import { fetchServicing } from "../services/mockServicingApi";
import type { CovenantComputed, CovenantStatus, ServicingPayload } from "../types";

function computeStatus(operator: "<=" | ">=", threshold: number, actual: number): CovenantStatus {
  // Define "watch" band as 5% buffer near threshold
  const buffer = Math.abs(threshold) * 0.05;

  if (operator === "<=") {
    if (actual <= threshold) {
      return actual >= threshold - buffer ? "WATCH" : "OK";
    }
    return "BREACH_RISK";
  }

  // >=
  if (actual >= threshold) {
    return actual <= threshold + buffer ? "WATCH" : "OK";
  }
  return "BREACH_RISK";
}

function computeHeadroom(operator: "<=" | ">=", threshold: number, actual: number): number {
  // positive headroom = good
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

export function useServicing(loanId: string | null) {
  return useQuery({
    queryKey: ["servicing", loanId],
    queryFn: async () => {
      if (!loanId) throw new Error("No loanId");
      return fetchServicing(loanId);
    },
    enabled: !!loanId,
  });
}
