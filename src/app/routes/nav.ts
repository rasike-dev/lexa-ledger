import { PORTFOLIO, INGEST, loanPaths } from "./paths";
import type { Role } from "../../auth/roles";
import { Roles } from "../../auth/roles";

export type UserRole = "agent" | "lender" | "borrower" | "buyer";

export type NavSection = {
  key: string;
  labelKey: string;
  items: NavItem[];
  // if true, section only appears when a loan is selected
  requiresActiveLoan?: boolean;
};

export type NavItem = {
  key: string;
  labelKey: string;
  // path can be computed when loanId is available
  path: string | ((loanId: string) => string);
  rolesAllowed: Role[];
};

export const navSections: NavSection[] = [
  {
    key: "global",
    labelKey: "nav.section.global",
    items: [
      {
        key: "portfolio",
        labelKey: "nav.portfolio",
        path: PORTFOLIO,
        rolesAllowed: [], // Accessible to all authenticated users
      },
      {
        key: "origination",
        labelKey: "nav.origination",
        path: INGEST,
        rolesAllowed: [Roles.LOAN_OFFICER, Roles.TENANT_ADMIN],
      },
    ],
  },
  {
    key: "loanWorkspace",
    labelKey: "nav.section.loanWorkspace",
    requiresActiveLoan: true,
    items: [
      {
        key: "loanOverview",
        labelKey: "nav.loan.overview",
        path: (loanId: string) => loanPaths.overview(loanId),
        rolesAllowed: [], // Accessible to all authenticated users
      },
      {
        key: "loanDocuments",
        labelKey: "nav.loan.documents",
        path: (loanId: string) => loanPaths.documents(loanId),
        rolesAllowed: [], // Accessible to all (action-gated internally)
      },
      {
        key: "loanServicing",
        labelKey: "nav.loan.servicing",
        path: (loanId: string) => loanPaths.servicing(loanId),
        rolesAllowed: [], // Accessible to all (action-gated internally)
      },
      {
        key: "loanTrading",
        labelKey: "nav.loan.trading",
        path: (loanId: string) => loanPaths.trading(loanId),
        rolesAllowed: [
          Roles.TRADING_ANALYST,
          Roles.TRADING_VIEWER,
          Roles.RISK_OFFICER,
          Roles.COMPLIANCE_AUDITOR,
          Roles.TENANT_ADMIN,
        ],
      },
      {
        key: "loanESG",
        labelKey: "nav.loan.esg",
        path: (loanId: string) => loanPaths.esg(loanId),
        rolesAllowed: [], // Accessible to all (action-gated internally)
      },
    ],
  },
];
