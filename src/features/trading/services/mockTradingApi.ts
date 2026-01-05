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
