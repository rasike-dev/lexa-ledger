import { env } from "@/app/config/env";
import { ingestLoanHttp, type IngestLoanRequest } from "./httpOriginationApi";

// For now, mock mode can keep existing behavior (if you have mock flow)
// If you don't have a mock, we can just throw or return demo-loan-001.
async function ingestLoanMock(_: IngestLoanRequest) {
  return { loanId: "demo-loan-001" };
}

export async function ingestLoan(body: IngestLoanRequest) {
  return env.apiMode === 'mock' ? ingestLoanMock(body) : ingestLoanHttp(body);
}

