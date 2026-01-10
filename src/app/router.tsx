import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { PORTFOLIO, INGEST, loanPaths } from "./routes/paths";
import { RequireRole } from "./guards/RequireRole";
import { Roles } from "../auth/roles";

import { PortfolioHome } from "../features/portfolio/pages/PortfolioHome";
import { IngestLoan } from "../features/origination/pages/IngestLoan";
import { LoanOverview } from "../features/loans/pages/LoanOverview";
import { LoanDocuments } from "../features/loans/pages/LoanDocuments";
import { LoanServicing } from "../features/loans/pages/LoanServicing";
import { LoanTrading } from "../features/loans/pages/LoanTrading";
import { LoanESG } from "../features/loans/pages/LoanESG";
import TradingReport from "../features/trading/pages/TradingReport";
import { Unauthorized } from "./pages/Unauthorized";

export const appRouter = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <Navigate to={PORTFOLIO} replace /> },
      
      // Portfolio - accessible to all authenticated users
      { path: PORTFOLIO, element: <PortfolioHome /> },
      
      // Origination/Ingest - requires LOAN_OFFICER or TENANT_ADMIN
      {
        path: INGEST,
        element: (
          <RequireRole roles={[Roles.LOAN_OFFICER, Roles.TENANT_ADMIN]}>
            <IngestLoan />
          </RequireRole>
        ),
      },

      // Loan Workspace - Overview (accessible to all)
      { path: loanPaths.overview(":loanId"), element: <LoanOverview /> },
      
      // Documents - accessible to all (action-gated internally)
      { path: loanPaths.documents(":loanId"), element: <LoanDocuments /> },
      
      // Servicing - accessible to all (action-gated internally)
      { path: loanPaths.servicing(":loanId"), element: <LoanServicing /> },
      
      // Trading - requires trading-related roles
      {
        path: loanPaths.trading(":loanId"),
        element: (
          <RequireRole
            roles={[
              Roles.TRADING_ANALYST,
              Roles.TRADING_VIEWER,
              Roles.RISK_OFFICER,
              Roles.COMPLIANCE_AUDITOR,
              Roles.TENANT_ADMIN,
            ]}
          >
            <LoanTrading />
          </RequireRole>
        ),
      },
      
      // Trading Report - same requirements as trading page
      {
        path: loanPaths.tradingReport(":loanId"),
        element: (
          <RequireRole
            roles={[
              Roles.TRADING_ANALYST,
              Roles.TRADING_VIEWER,
              Roles.RISK_OFFICER,
              Roles.COMPLIANCE_AUDITOR,
              Roles.TENANT_ADMIN,
            ]}
          >
            <TradingReport />
          </RequireRole>
        ),
      },
      
      // ESG - accessible to all (action-gated internally)
      { path: loanPaths.esg(":loanId"), element: <LoanESG /> },

      // Unauthorized page
      { path: "/unauthorized", element: <Unauthorized /> },

      // Fallback
      { path: "*", element: <Navigate to={PORTFOLIO} replace /> },
    ],
  },
]);
