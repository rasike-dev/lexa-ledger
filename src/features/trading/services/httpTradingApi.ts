import { httpClient } from "@/shared/api/httpClient";
import { z } from "zod";

const ChecklistItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  category: z.string(),
  weight: z.number(),
  status: z.enum(["OPEN", "DONE", "BLOCKED"]),
  evidenceRef: z.string().nullable().optional(),
  updatedAt: z.string(),
});

const TradingSummarySchema = z.object({
  loanId: z.string(),
  score: z.number(),
  band: z.enum(["RED", "AMBER", "GREEN"]),
  computedAt: z.string().nullable(),
  reasons: z.any().nullable().optional(),
  checklist: z.array(ChecklistItemSchema),
});

export type TradingSummary = z.infer<typeof TradingSummarySchema>;
export type TradingChecklistItem = z.infer<typeof ChecklistItemSchema>;

export async function fetchTradingSummaryHttp(loanId: string): Promise<TradingSummary> {
  const data = await httpClient.get<unknown>(`/loans/${loanId}/trading/summary`);
  return TradingSummarySchema.parse(data);
}

export async function requestTradingRecomputeHttp(loanId: string) {
  return httpClient.post<{ ok: true; loanId: string }>(`/loans/${loanId}/trading/recompute`, {});
}

