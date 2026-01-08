// src/features/loans/services/httpLoanApi.ts

import { httpClient } from "@/shared/api/httpClient";

import { LoanSnapshotSchema, type LoanSnapshot } from "../../sharedDomain/loan";

import { AuditTimelineSchema, type AuditTimeline } from "../../sharedDomain/audit";

export async function fetchLoanSnapshotHttp(loanId: string): Promise<LoanSnapshot> {
  const data = await httpClient.get<unknown>(`/loans/${loanId}/snapshot`);
  return LoanSnapshotSchema.parse(data);
}

export async function fetchAuditTimelineHttp(loanId: string): Promise<AuditTimeline> {
  const data = await httpClient.get<unknown>(`/loans/${loanId}/audit`);
  return AuditTimelineSchema.parse(data);
}

