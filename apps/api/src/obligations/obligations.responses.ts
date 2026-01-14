import { ObligationDto } from './obligation.types';

export type LoanObligationsResponse = {
  loanId: string;
  asOf: string; // ISO
  obligations: ObligationDto[];
};

export type PortfolioObligationsResponse = {
  asOf: string; // ISO
  days: number;
  obligations: ObligationDto[];
};
