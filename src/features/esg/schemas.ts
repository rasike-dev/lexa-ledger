import { z } from "zod";

export const KpiDirectionSchema = z.enum(["LOWER_IS_BETTER", "HIGHER_IS_BETTER"]);

export const EsgKpiSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string(),
  period: z.string(),
  target: z.number(),
  actual: z.number(),
  direction: KpiDirectionSchema,
  linkedClauseRef: z.string().optional(),
});

export const EvidenceTypeSchema = z.enum(["REPORT", "INVOICE", "AUDIT_LETTER", "OTHER"]);
export const EvidenceStatusSchema = z.enum(["VERIFIED", "UNVERIFIED"]);

export const EvidenceItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: EvidenceTypeSchema,
  status: EvidenceStatusSchema,
  provider: z.string(),
  verifiedBy: z.string().optional(),
  verifiedAt: z.string().optional(),
  sourceRef: z.string().optional(),
  appliesToKpiIds: z.array(z.string()),
});

export const EsgPayloadSchema = z.object({
  loanId: z.string(),
  asOf: z.string(),
  kpis: z.array(EsgKpiSchema),
  evidence: z.array(EvidenceItemSchema),
});
