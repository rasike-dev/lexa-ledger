export class IngestLoanRequestDto {
  borrower!: string;
  agentBank!: string;
  currency!: string;        // e.g., "USD"
  facilityAmount!: number;  // e.g., 250000000
  marginBps!: number;       // e.g., 325
}

export class IngestLoanResponseDto {
  loanId!: string;
}

