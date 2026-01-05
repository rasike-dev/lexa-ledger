import { z } from "zod";

export const ClauseTagSchema = z.enum(["PRICING", "COVENANT", "REPORTING", "ESG", "EOD"]);

export const ClauseSchema = z.object({
  id: z.string(),
  title: z.string(),
  tag: ClauseTagSchema,
  sourceRef: z.string(),
  structured: z.any(),
});

export const DocVersionSchema = z.object({
  versionId: z.string(),
  label: z.string(),
  asOf: z.string(),
});

export const AmendmentSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const AmendmentChangeSchema = z.object({
  field: z.string(),
  from: z.string(),
  to: z.string(),
  severity: AmendmentSeveritySchema,
  impacts: z.array(z.string()),
});

export const ClausesPayloadSchema = z.object({
  loanId: z.string(),
  versions: z.array(DocVersionSchema),
  clauses: z.array(ClauseSchema),
  amendmentSummary: z.array(AmendmentChangeSchema),
});
