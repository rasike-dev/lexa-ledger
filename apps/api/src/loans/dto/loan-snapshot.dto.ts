export class LoanSnapshotDto {
  id!: string;
  borrower!: string;
  agentBank!: string;
  currency!: string;
  facilityAmount!: number;
  marginBps!: number;
  status!: string;
  esgClauses!: number;
  covenants!: number;
  lastUpdatedAt!: string;
}

