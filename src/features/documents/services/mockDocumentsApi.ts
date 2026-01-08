import data from "../../../mocks/fixtures/clauses_demo_001.json";
import { ClausesPayloadSchema } from "../schemas";
import type { ClausesPayload } from "../types";
import { z } from "zod";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Original function for loan-based payload (keep for backward compatibility with LoanDocuments page)
export async function fetchClausesPayload(loanId: string): Promise<ClausesPayload> {
  await sleep(250);
  const payload = loanId === "demo-loan-001" ? data : { ...data, loanId };

  const result = ClausesPayloadSchema.safeParse(payload);
  if (!result.success) {
    console.error("Schema validation error:", result.error);
    throw new Error(`Failed to validate clauses data: ${result.error.message}`);
  }

  return result.data;
}

// New function for document version-based clauses (aligned with backend API)
const ClauseSchema = z.object({
  id: z.string().optional(),
  clauseRef: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  text: z.string(),
  riskTags: z.array(z.string()).optional().default([]),
  extractedAt: z.string().optional(),
});

const ClausesSchema = z.array(ClauseSchema);

// Demo fallback: ignore documentVersionId for now, return just clauses array
export async function fetchClauses(_documentVersionId: string) {
  await sleep(250);
  return ClausesSchema.parse(data.clauses.map(c => ({
    id: c.id,
    clauseRef: c.sourceRef,
    title: c.title,
    text: `[Mock] ${c.title} - ${c.tag}`,
    riskTags: [c.tag],
    extractedAt: new Date().toISOString(),
  })));
}
