import { httpClient } from "@/shared/api/httpClient";
import { z } from "zod";

const VerificationSchema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "NEEDS_REVIEW", "REJECTED"]),
  confidence: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  checkedAt: z.string(),
});

const EvidenceSchema = z.object({
  id: z.string(),
  kpiId: z.string().nullable().optional(),
  type: z.string(),
  title: z.string(),
  fileName: z.string(),
  contentType: z.string(),
  fileKey: z.string(),
  checksum: z.string().nullable().optional(),
  uploadedAt: z.string(),
  latestVerification: VerificationSchema.nullable().optional(),
});

const KpiSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  unit: z.string().nullable().optional(),
  target: z.number().nullable().optional(),
  current: z.number().nullable().optional(),
  asOfDate: z.string().nullable().optional(),
});

const EsgSummarySchema = z.object({
  loanId: z.string(),
  kpis: z.array(KpiSchema),
  evidence: z.array(EvidenceSchema),
});

export type EsgSummary = z.infer<typeof EsgSummarySchema>;
export type EsgKpi = z.infer<typeof KpiSchema>;
export type EsgEvidence = z.infer<typeof EvidenceSchema>;

export async function fetchEsgSummaryHttp(loanId: string): Promise<EsgSummary> {
  const data = await httpClient.get<unknown>(`/loans/${loanId}/esg/summary`);
  return EsgSummarySchema.parse(data);
}

export async function createEsgKpiHttp(loanId: string, body: {
  type: string;
  title: string;
  unit?: string;
  target?: number;
  current?: number;
  asOfDate?: string;
}) {
  return httpClient.post<{ id: string }>(`/loans/${loanId}/esg/kpis`, body);
}

export async function uploadEsgEvidenceHttp(loanId: string, form: FormData) {
  // form must include: title, type, optional kpiId, and file
  return httpClient.postForm<{ evidenceId: string; fileKey: string; status: "PENDING" }>(
    `/loans/${loanId}/esg/evidence/upload`,
    form,
  );
}

export async function requestEsgVerifyNowHttp(loanId: string, evidenceId: string) {
  return httpClient.post<{ ok: true; evidenceId: string }>(
    `/loans/${loanId}/esg/evidence/${evidenceId}/verify`,
    {},
  );
}
