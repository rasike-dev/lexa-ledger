import { z } from "zod";

export const LoanSnapshotSchema = z.object({
  id: z.string(),
  borrower: z.string(),
  agentBank: z.string(),
  currency: z.string(),
  facilityAmount: z.number(),
  marginBps: z.number(),
  status: z.string(),
  esgClauses: z.number(),
  covenants: z.number(),
  lastUpdatedAt: z.string(),
});

export type LoanSnapshot = z.infer<typeof LoanSnapshotSchema>;
