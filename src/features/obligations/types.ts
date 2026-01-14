export type ObligationStatus = "OK" | "DUE_SOON" | "OVERDUE";
export type ObligationSeverity = "LOW" | "MEDIUM" | "HIGH";
export type ObligationSourceType = "CLAUSE" | "COVENANT" | "ESG_KPI";

export type ObligationDto = {
  id: string;
  tenantId: string;
  loanId: string;

  title: string;
  dueDate: string;
  status: ObligationStatus;
  severity: ObligationSeverity;

  sourceType: ObligationSourceType;
  sourceId: string;
  sourceLabel: string;

  rationale: string;
};

export type LoanObligationsResponse = {
  loanId: string;
  asOf: string;
  obligations: ObligationDto[];
};

export type PortfolioObligationsResponse = {
  asOf: string;
  days: number;
  obligations: ObligationDto[];
};
