import { httpClient } from "@/shared/api/httpClient";
import { z } from "zod";

// minimal schema aligned with API response
export const ClauseDtoSchema = z.object({
  id: z.string(),
  clauseRef: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  text: z.string(),
  riskTags: z.array(z.string()).default([]),
  extractedAt: z.string().optional(),
});

export const ClausesResponseSchema = z.array(ClauseDtoSchema);

export type ClauseDto = z.infer<typeof ClauseDtoSchema>;

export async function fetchClausesHttp(documentVersionId: string): Promise<ClauseDto[]> {
  const data = await httpClient.get<unknown>(`/document-versions/${documentVersionId}/clauses`);
  return ClausesResponseSchema.parse(data);
}

