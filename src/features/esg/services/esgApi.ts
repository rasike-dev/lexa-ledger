import { useUIStore } from "@/app/store/uiStore";
import { fetchEsgSummaryHttp, createEsgKpiHttp, uploadEsgEvidenceHttp, requestEsgVerifyNowHttp } from "./httpEsgApi";
import { fetchEsgSummary as fetchEsgSummaryMock } from "./mockEsgApi";

export async function fetchEsgSummary(loanId: string) {
  const { demoMode } = useUIStore.getState();
  return demoMode ? fetchEsgSummaryMock(loanId) : fetchEsgSummaryHttp(loanId);
}

export async function createEsgKpi(loanId: string, body: any) {
  const { demoMode } = useUIStore.getState();
  if (demoMode) return { id: "demo-kpi-created" };
  return createEsgKpiHttp(loanId, body);
}

export async function uploadEsgEvidence(loanId: string, form: FormData) {
  const { demoMode } = useUIStore.getState();
  if (demoMode) return { evidenceId: "demo-evidence", fileKey: "demo", status: "PENDING" as const };
  return uploadEsgEvidenceHttp(loanId, form);
}

export async function requestEsgVerifyNow(loanId: string, evidenceId: string) {
  const { demoMode } = useUIStore.getState();
  if (demoMode) return { ok: true as const, evidenceId };
  return requestEsgVerifyNowHttp(loanId, evidenceId);
}
