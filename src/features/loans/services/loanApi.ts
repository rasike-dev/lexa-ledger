// src/features/loans/services/loanApi.ts

import {
  fetchLoanSnapshot as fetchLoanSnapshotMock,
  fetchAuditTimeline as fetchAuditTimelineMock,
} from "./mockLoanApi";

import { fetchLoanSnapshotHttp, fetchAuditTimelineHttp } from "./httpLoanApi";

import { env } from "@/app/config/env";

export async function fetchLoanSnapshot(loanId: string) {
  return env.apiMode === 'mock' ? fetchLoanSnapshotMock(loanId) : fetchLoanSnapshotHttp(loanId);
}

export async function fetchAuditTimeline(loanId: string) {
  return env.apiMode === 'mock' ? fetchAuditTimelineMock(loanId) : fetchAuditTimelineHttp(loanId);
}

