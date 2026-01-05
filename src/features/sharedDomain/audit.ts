import { z } from "zod";

export const AuditEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.string(),
  actor: z.string(),
  summary: z.string(),
  evidenceRef: z.string().optional(),
});

export const AuditTimelineSchema = z.array(AuditEventSchema);

export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type AuditTimeline = z.infer<typeof AuditTimelineSchema>;
