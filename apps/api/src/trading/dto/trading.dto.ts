export type TradingItemStatusDto = "OPEN" | "DONE" | "BLOCKED";
export type ReadinessBandDto = "RED" | "AMBER" | "GREEN";

export class TradingChecklistItemDto {
  id!: string;
  code!: string;
  title!: string;
  category!: string;
  weight!: number;
  status!: TradingItemStatusDto;
  evidenceRef?: string | null;
  updatedAt!: string;
}

export class TradingSummaryResponseDto {
  loanId!: string;
  // latest computed readiness
  score!: number;
  band!: ReadinessBandDto;
  computedAt!: string | null;
  reasons?: any;
  // checklist
  checklist!: TradingChecklistItemDto[];
}

export class TradingRecomputeResponseDto {
  ok!: true;
  loanId!: string;
}
