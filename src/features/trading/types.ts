export type ChecklistStatus = "PASS" | "REVIEW" | "FAIL";

export type DiligenceCheck = {
  id: string;
  title: string;
  auto: boolean;
  statusBase: ChecklistStatus;
  statusStress: ChecklistStatus;
  sourceRef?: string;
};

export type TradingChecklistPayload = {
  loanId: string;
  checklist: DiligenceCheck[];
};
