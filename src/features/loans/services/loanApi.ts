// src/features/loans/services/loanApi.ts

import {
  fetchLoanSnapshot as fetchLoanSnapshotMock,
  fetchAuditTimeline as fetchAuditTimelineMock,
} from "./mockLoanApi";

import { fetchLoanSnapshotHttp, fetchAuditTimelineHttp } from "./httpLoanApi";

import { useUIStore } from "@/app/store/uiStore";

export async function fetchLoanSnapshot(loanId: string) {
  const { demoMode } = useUIStore.getState();
  return demoMode ? fetchLoanSnapshotMock(loanId) : fetchLoanSnapshotHttp(loanId);
}

export async function fetchAuditTimeline(loanId: string) {
  const { demoMode } = useUIStore.getState();
  return demoMode ? fetchAuditTimelineMock(loanId) : fetchAuditTimelineHttp(loanId);
}

