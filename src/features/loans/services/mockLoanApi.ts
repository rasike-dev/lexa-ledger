import loanDemo001 from "../../../mocks/fixtures/loan_demo_001.json";
import auditDemo001 from "../../../mocks/fixtures/audit_demo_001.json";
import { LoanSnapshotSchema, type LoanSnapshot } from "../../sharedDomain/loan";
import { AuditTimelineSchema, type AuditTimeline } from "../../sharedDomain/audit";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchLoanSnapshot(loanId: string): Promise<LoanSnapshot> {
  await sleep(250); // realism
  if (loanId !== "demo-loan-001") {
    // fallback: show demo for any loanId during skeleton phase
    const data = { ...loanDemo001, id: loanId };
    return LoanSnapshotSchema.parse(data);
  }
  return LoanSnapshotSchema.parse(loanDemo001);
}

export async function fetchAuditTimeline(_loanId: string): Promise<AuditTimeline> {
  await sleep(250);
  // Use demo events but bind to current loan id in summary if needed later
  const data = auditDemo001;
  return AuditTimelineSchema.parse(data);
}
