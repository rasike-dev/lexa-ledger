export type ObligationStatus = 'OK' | 'DUE_SOON' | 'OVERDUE';
export type ObligationSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type ObligationSourceType = 'CLAUSE' | 'COVENANT' | 'ESG_KPI';

export type ObligationDto = {
  id: string;              // stable deterministic id
  tenantId: string;
  loanId: string;

  title: string;
  dueDate: string;         // ISO string
  status: ObligationStatus;
  severity: ObligationSeverity;

  sourceType: ObligationSourceType;
  sourceId: string;
  sourceLabel: string;

  rationale: string;       // 1–2 lines, human-friendly
};
