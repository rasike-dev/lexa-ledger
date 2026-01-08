export class AuditEventDto {
  id!: string;
  type!: string;
  timestamp!: string;
  actor!: string;
  summary!: string;
  evidenceRef?: string;
}

