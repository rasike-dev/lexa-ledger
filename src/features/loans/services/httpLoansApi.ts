import { httpClient } from "@/shared/api/httpClient";
import { z } from "zod";

const LoanListItemSchema = z.object({
  id: z.string(),
  borrower: z.string(),
  agentBank: z.string(),
  currency: z.string(),
  facilityAmount: z.number(),
  marginBps: z.number(),
  status: z.string(),
  lastUpdatedAt: z.string(),
});

export const LoanListSchema = z.array(LoanListItemSchema);
export type LoanListItem = z.infer<typeof LoanListItemSchema>;

export async function fetchLoansHttp(): Promise<LoanListItem[]> {
  const data = await httpClient.get<unknown>(`/loans`);
  return LoanListSchema.parse(data);
}

