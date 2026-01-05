export const PORTFOLIO = "/portfolio";
export const INGEST = "/origination/ingest";

// Loan workspace path builders
export const loanPaths = {
  overview: (loanId: string) => `/loans/${loanId}/overview`,
  documents: (loanId: string) => `/loans/${loanId}/documents`,
  servicing: (loanId: string) => `/loans/${loanId}/servicing`,
  trading: (loanId: string) => `/loans/${loanId}/trading`,
  esg: (loanId: string) => `/loans/${loanId}/esg`,
  tradingReport: (loanId: string) => `/loans/${loanId}/trading/report`,
};
