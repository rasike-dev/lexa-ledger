export type RiskFlag = "OK" | "WATCH" | "BREACH_RISK";

export type PortfolioLoanRow = {
  id: string;
  borrower: string;
  agentBank: string;
  currency: string;
  facilityAmount: number;
  marginBps: number;
  status: string;
  esgClauses: number;
  covenants: number;
  riskFlag: RiskFlag;
  tradeReadyScore: number;
  nextObligationDue: string;
  lastUpdatedAt: string;
};

export type PortfolioData = {
  asOf: string;
  loans: PortfolioLoanRow[];
};

export type PortfolioKpis = {
  totalLoans: number;
  totalExposureBase: number; // summed numeric (no FX conversion in demo)
  loansAtRisk: number; // WATCH + BREACH_RISK
  tradeReadyCount: number; // score >= 85
  obligationsDueSoon: number; // due within next 14 days
  esgClausesTotal: number;
};
