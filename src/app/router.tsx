import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { PORTFOLIO, INGEST, loanPaths } from "./routes/paths";

import { PortfolioHome } from "../features/portfolio/pages/PortfolioHome";
import { IngestLoan } from "../features/origination/pages/IngestLoan";
import { LoanOverview } from "../features/loans/pages/LoanOverview";
import { LoanDocuments } from "../features/loans/pages/LoanDocuments";
import { LoanServicing } from "../features/loans/pages/LoanServicing";
import { LoanTrading } from "../features/loans/pages/LoanTrading";
import { LoanESG } from "../features/loans/pages/LoanESG";
import { TradingReport } from "../features/trading/pages/TradingReport";

export const appRouter = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <Navigate to={PORTFOLIO} replace /> },
      { path: PORTFOLIO, element: <PortfolioHome /> },
      { path: INGEST, element: <IngestLoan /> },

      // Loan Workspace (nested routes by pattern)
      { path: loanPaths.overview(":loanId"), element: <LoanOverview /> },
      { path: loanPaths.documents(":loanId"), element: <LoanDocuments /> },
      { path: loanPaths.servicing(":loanId"), element: <LoanServicing /> },
      { path: loanPaths.trading(":loanId"), element: <LoanTrading /> },
      { path: loanPaths.esg(":loanId"), element: <LoanESG /> },
      { path: loanPaths.tradingReport(":loanId"), element: <TradingReport /> },

      // Fallback
      { path: "*", element: <Navigate to={PORTFOLIO} replace /> },
    ],
  },
]);
