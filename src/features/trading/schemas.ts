import { z } from "zod";

export const ChecklistStatusSchema = z.enum(["PASS", "REVIEW", "FAIL"]);

export const DiligenceCheckSchema = z.object({
  id: z.string(),
  title: z.string(),
  auto: z.boolean(),
  statusBase: ChecklistStatusSchema,
  statusStress: ChecklistStatusSchema,
  sourceRef: z.string().optional(),
});

export const TradingChecklistPayloadSchema = z.object({
  loanId: z.string(),
  checklist: z.array(DiligenceCheckSchema),
});
