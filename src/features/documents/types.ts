export type ClauseTag = "PRICING" | "COVENANT" | "REPORTING" | "ESG" | "EOD";

export type Clause = {
  id: string;
  title: string;
  tag: ClauseTag;
  sourceRef: string;
  structured: Record<string, unknown>;
};

export type DocVersion = {
  versionId: string;
  label: string;
  asOf: string;
};

export type AmendmentSeverity = "LOW" | "MEDIUM" | "HIGH";

export type AmendmentChange = {
  field: string;
  from: string;
  to: string;
  severity: AmendmentSeverity;
  impacts: string[];
};

export type ClausesPayload = {
  loanId: string;
  versions: DocVersion[];
  clauses: Clause[];
  amendmentSummary: AmendmentChange[];
};
