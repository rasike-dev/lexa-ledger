export type ESGVerificationStatusDto = "PENDING" | "VERIFIED" | "NEEDS_REVIEW" | "REJECTED";

export class ESGKpiDto {
  id!: string;
  type!: string;
  title!: string;
  unit?: string | null;
  target?: number | null;
  current?: number | null;
  asOfDate?: string | null;
}

export class ESGEvidenceDto {
  id!: string;
  kpiId?: string | null;
  type!: string;
  title!: string;
  fileName!: string;
  contentType!: string;
  fileKey!: string;
  checksum?: string | null;
  uploadedAt!: string;
  latestVerification?: {
    status: ESGVerificationStatusDto;
    confidence?: number | null;
    notes?: string | null;
    checkedAt: string;
  } | null;
}

export class ESGSummaryResponseDto {
  loanId!: string;
  kpis!: ESGKpiDto[];
  evidence!: ESGEvidenceDto[];
}

export class CreateKpiRequestDto {
  type!: string; // ESGKpiType
  title!: string;
  unit?: string;
  target?: number;
  current?: number;
  asOfDate?: string; // ISO
}

export class UploadEvidenceResponseDto {
  evidenceId!: string;
  fileKey!: string;
  status!: ESGVerificationStatusDto; // starts as PENDING
}

