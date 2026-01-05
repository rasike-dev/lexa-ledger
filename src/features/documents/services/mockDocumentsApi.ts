import data from "../../../mocks/fixtures/clauses_demo_001.json";
import { ClausesPayloadSchema } from "../schemas";
import type { ClausesPayload } from "../types";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchClauses(loanId: string): Promise<ClausesPayload> {
  await sleep(250);
  const payload = loanId === "demo-loan-001" ? data : { ...data, loanId };

  const result = ClausesPayloadSchema.safeParse(payload);
  if (!result.success) {
    console.error("Schema validation error:", result.error);
    throw new Error(`Failed to validate clauses data: ${result.error.message}`);
  }

  return result.data;
}
