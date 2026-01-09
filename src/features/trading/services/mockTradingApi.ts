import data from "../../../mocks/fixtures/trading_demo_checklist.json";
import { TradingChecklistPayloadSchema } from "../schemas";
import type { TradingChecklistPayload } from "../types";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchTradingChecklist(loanId: string): Promise<TradingChecklistPayload> {
  await sleep(250);
  if (loanId === "demo-loan-001") return TradingChecklistPayloadSchema.parse(data);
  return TradingChecklistPayloadSchema.parse({ ...data, loanId });
}

export async function fetchTradingSummary(loanId: string) {
  await sleep(250);
  
  // Convert old fixture format to new API format
  const fixtureData = data as any;
  const checklist = (fixtureData.checklist || []).map((x: any, idx: number) => ({
    id: x.id ?? `demo-item-${idx}`,
    code: x.code ?? `DEMO.${idx}`,
    title: x.title ?? "Checklist item",
    category: x.category ?? "DOCUMENTS",
    weight: x.weight ?? 10,
    // Map old PASS/REVIEW/FAIL to DONE/OPEN/BLOCKED
    status: (x.statusBase === "PASS" ? "DONE" : "OPEN") as "OPEN" | "DONE" | "BLOCKED",
    evidenceRef: x.sourceRef ?? null,
    updatedAt: new Date().toISOString(),
  }));

  // Crude score for demo
  const total = checklist.reduce((s: number, i: any) => s + i.weight, 0) || 1;
  const done = checklist.reduce((s: number, i: any) => s + (i.status === "DONE" ? i.weight : 0), 0);
  const score = Math.round((done / total) * 100);
  const band = score >= 80 ? "GREEN" : score >= 50 ? "AMBER" : "RED";

  return {
    loanId,
    score,
    band,
    computedAt: new Date().toISOString(),
    reasons: { doneWeight: done, totalWeight: total },
    checklist,
  };
}
