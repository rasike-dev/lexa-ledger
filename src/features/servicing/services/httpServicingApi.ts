import { httpClient } from "@/shared/api/httpClient";
import { z } from "zod";

const CovenantRowSchema = z.object({
  covenantId: z.string(),
  code: z.string(),
  title: z.string(),
  threshold: z.number(),
  unit: z.string().nullable().optional(),

  value: z.number(),
  status: z.enum(["PASS", "WARN", "FAIL"]),
  testedAt: z.string(),
  notes: z.string().nullable().optional(),
});

const ServicingSummarySchema = z.object({
  loanId: z.string(),
  scenario: z.enum(["BASE", "STRESS"]),
  lastTestedAt: z.string().nullable(),
  covenants: z.array(CovenantRowSchema),
});

export type ServicingSummary = z.infer<typeof ServicingSummarySchema>;

export async function fetchServicingSummaryHttp(loanId: string): Promise<ServicingSummary> {
  const data = await httpClient.get<unknown>(`/loans/${loanId}/servicing/summary`);
  return ServicingSummarySchema.parse(data);
}

export async function setServicingScenarioHttp(loanId: string, scenario: "BASE" | "STRESS") {
  return httpClient.post<{ loanId: string; scenario: "BASE" | "STRESS" }>(
    `/loans/${loanId}/servicing/scenario`,
    { scenario },
  );
}

export async function requestServicingRecomputeHttp(loanId: string, scenario?: "BASE" | "STRESS") {
  return httpClient.post<{ ok: true; loanId: string; scenario: "BASE" | "STRESS" }>(
    `/loans/${loanId}/servicing/recompute`,
    scenario ? { scenario } : {},
  );
}

