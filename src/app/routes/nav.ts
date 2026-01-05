import { PORTFOLIO, INGEST, loanPaths } from "./paths";

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
  rolesAllowed: UserRole[];
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
        rolesAllowed: ["agent", "lender", "borrower", "buyer"],
      },
      {
        key: "origination",
        labelKey: "nav.origination",
        path: INGEST,
        rolesAllowed: ["agent", "lender"],
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
        rolesAllowed: ["agent", "lender", "borrower", "buyer"],
      },
      {
        key: "loanDocuments",
        labelKey: "nav.loan.documents",
        path: (loanId: string) => loanPaths.documents(loanId),
        rolesAllowed: ["agent", "lender", "borrower", "buyer"],
      },
      {
        key: "loanServicing",
        labelKey: "nav.loan.servicing",
        path: (loanId: string) => loanPaths.servicing(loanId),
        rolesAllowed: ["agent", "lender", "borrower"],
      },
      {
        key: "loanTrading",
        labelKey: "nav.loan.trading",
        path: (loanId: string) => loanPaths.trading(loanId),
        rolesAllowed: ["agent", "lender", "buyer"],
      },
      {
        key: "loanESG",
        labelKey: "nav.loan.esg",
        path: (loanId: string) => loanPaths.esg(loanId),
        rolesAllowed: ["agent", "lender", "borrower", "buyer"],
      },
    ],
  },
];
