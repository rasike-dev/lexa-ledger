import data from "../../../mocks/fixtures/esg_demo_001.json";
import { EsgPayloadSchema } from "../schemas";
import type { EsgPayload, EsgScorecard, KpiStatus } from "../types";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchEsg(loanId: string): Promise<EsgPayload> {
  await sleep(250);
  if (loanId === "demo-loan-001") return EsgPayloadSchema.parse(data);
  return EsgPayloadSchema.parse({ ...data, loanId });
}

// Simple, explainable KPI status model for demo:
// - For LOWER_IS_BETTER: actual <= target => ON_TRACK, within 10% => AT_RISK, else OFF_TRACK
// - For HIGHER_IS_BETTER: actual >= target => ON_TRACK, within 10% => AT_RISK, else OFF_TRACK
export function computeKpiStatus(
  direction: "LOWER_IS_BETTER" | "HIGHER_IS_BETTER",
  target: number,
  actual: number
): KpiStatus {
  const band = Math.abs(target) * 0.1;

  if (direction === "LOWER_IS_BETTER") {
    if (actual <= target) return "ON_TRACK";
    if (actual <= target + band) return "AT_RISK";
    return "OFF_TRACK";
  }

  // HIGHER_IS_BETTER
  if (actual >= target) return "ON_TRACK";
  if (actual >= target - band) return "AT_RISK";
  return "OFF_TRACK";
}

export function computeEsgScorecard(payload: EsgPayload): EsgScorecard {
  const kpiIds = payload.kpis.map((k) => k.id);

  const verifiedByKpi = new Set<string>();
  payload.evidence
    .filter((e) => e.status === "VERIFIED")
    .forEach((e) => e.appliesToKpiIds.forEach((id) => verifiedByKpi.add(id)));

  const verifiedCoveragePct =
    kpiIds.length === 0
      ? 0
      : Math.round((kpiIds.filter((id) => verifiedByKpi.has(id)).length / kpiIds.length) * 100);

  let on = 0,
    risk = 0,
    off = 0;
  for (const k of payload.kpis) {
    const s = computeKpiStatus(k.direction, k.target, k.actual);
    if (s === "ON_TRACK") on++;
    else if (s === "AT_RISK") risk++;
    else off++;
  }

  // Overall: RED if any OFF_TRACK and low evidence coverage; AMBER otherwise if any AT_RISK/OFF; GREEN if all on track and good coverage.
  const overall =
    off > 0 ? "RED" : risk > 0 ? "AMBER" : verifiedCoveragePct >= 67 ? "GREEN" : "AMBER";

  return {
    verifiedCoveragePct,
    kpisOnTrack: on,
    kpisAtRisk: risk,
    kpisOffTrack: off,
    overall,
  };
}
