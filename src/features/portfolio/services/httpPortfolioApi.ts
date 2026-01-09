import { httpClient } from "@/shared/api/httpClient";
import { z } from "zod";

const PortfolioLoanSchema = z.object({
  id: z.string(),
  borrower: z.string(),
  currency: z.string(),
  facilityAmount: z.number(),
  status: z.string(),
  lastUpdatedAt: z.string(),

  documents: z.object({
    count: z.number(),
    latestFacilityAgreementVersion: z.number().nullable().optional(),
  }),

  servicing: z.object({
    scenario: z.enum(["BASE", "STRESS"]),
    lastTestedAt: z.string().nullable().optional(),
    failingCount: z.number(),
  }),

  trading: z.object({
    score: z.number(),
    band: z.enum(["RED", "AMBER", "GREEN"]),
    computedAt: z.string().nullable().optional(),
  }),

  esg: z.object({
    kpiCount: z.number(),
    offTrackCount: z.number(),
    evidencePendingCount: z.number(),
  }),
});

const PortfolioLoansResponseSchema = z.object({
  loans: z.array(PortfolioLoanSchema),
});

const PortfolioSummarySchema = z.object({
  totals: z.object({
    loans: z.number(),
    facilityAmount: z.number(),
  }),
  tradingBands: z.object({
    green: z.number(),
    amber: z.number(),
    red: z.number(),
  }),
  servicing: z.object({
    loansWithFails: z.number(),
    totalFails: z.number(),
  }),
  esg: z.object({
    evidencePending: z.number(),
    offTrackKpis: z.number(),
  }),
  lastRefreshedAt: z.string(),
});

export type PortfolioLoan = z.infer<typeof PortfolioLoanSchema>;
export type PortfolioLoansResponse = z.infer<typeof PortfolioLoansResponseSchema>;
export type PortfolioSummary = z.infer<typeof PortfolioSummarySchema>;

export async function fetchPortfolioLoansHttp(): Promise<PortfolioLoansResponse> {
  const data = await httpClient.get<unknown>(`/portfolio/loans`);
  return PortfolioLoansResponseSchema.parse(data);
}

export async function fetchPortfolioSummaryHttp(): Promise<PortfolioSummary> {
  const data = await httpClient.get<unknown>(`/portfolio/summary`);
  return PortfolioSummarySchema.parse(data);
}

