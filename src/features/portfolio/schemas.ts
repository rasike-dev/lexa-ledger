// schemas.ts - Portfolio Zod schemas

import { z } from "zod";

export const PortfolioLoanRowSchema = z.object({
  id: z.string(),
  borrower: z.string(),
  agentBank: z.string(),
  currency: z.string(),
  facilityAmount: z.number(),
  marginBps: z.number(),
  status: z.string(),
  esgClauses: z.number(),
  covenants: z.number(),
  riskFlag: z.enum(["OK", "WATCH", "BREACH_RISK"]),
  tradeReadyScore: z.number(),
  nextObligationDue: z.string(),
  lastUpdatedAt: z.string(),
});

export const PortfolioDataSchema = z.object({
  asOf: z.string(),
  loans: z.array(PortfolioLoanRowSchema),
});
