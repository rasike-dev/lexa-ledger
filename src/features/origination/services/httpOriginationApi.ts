import { httpClient } from "@/shared/api/httpClient";

export type IngestLoanRequest = {
  borrower: string;
  agentBank: string;
  currency: string;
  facilityAmount: number;
  marginBps: number;
};

export type IngestLoanResponse = {
  loanId: string;
};

export async function ingestLoanHttp(body: IngestLoanRequest): Promise<IngestLoanResponse> {
  return httpClient.post<IngestLoanResponse>(`/origination/ingest`, body);
}

