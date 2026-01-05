export type CovenantOperator = "<=" | ">=";

export type Covenant = {
  id: string;
  name: string;
  unit: string;
  operator: CovenantOperator;
  threshold: number;
  actualBase: number;
  actualStress: number;
  testFrequency: string;
};

export type Obligation = {
  id: string;
  title: string;
  dueDate: string;
  owner: string;
  status: "Pending" | "Planned" | "Completed";
};

export type ServicingPayload = {
  loanId: string;
  covenants: Covenant[];
  obligations: Obligation[];
};

export type CovenantStatus = "OK" | "WATCH" | "BREACH_RISK";

export type CovenantComputed = Covenant & {
  actual: number;
  status: CovenantStatus;
  headroom: number; // signed distance from threshold (positive = better)
};
