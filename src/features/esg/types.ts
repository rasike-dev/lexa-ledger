export type KpiDirection = "LOWER_IS_BETTER" | "HIGHER_IS_BETTER";

export type EsgKpi = {
  id: string;
  name: string;
  unit: string;
  period: string;
  target: number;
  actual: number;
  direction: KpiDirection;
  linkedClauseRef?: string;
};

export type EvidenceType = "REPORT" | "INVOICE" | "AUDIT_LETTER" | "OTHER";
export type EvidenceStatus = "VERIFIED" | "UNVERIFIED";

export type EvidenceItem = {
  id: string;
  title: string;
  type: EvidenceType;
  status: EvidenceStatus;
  provider: string;
  verifiedBy?: string;
  verifiedAt?: string;
  sourceRef?: string;
  appliesToKpiIds: string[];
};

export type EsgPayload = {
  loanId: string;
  asOf: string;
  kpis: EsgKpi[];
  evidence: EvidenceItem[];
};

export type KpiStatus = "ON_TRACK" | "AT_RISK" | "OFF_TRACK";

export type EsgScorecard = {
  verifiedCoveragePct: number; // % of KPIs with at least one VERIFIED evidence item
  kpisOnTrack: number;
  kpisAtRisk: number;
  kpisOffTrack: number;
  overall: "GREEN" | "AMBER" | "RED";
};
