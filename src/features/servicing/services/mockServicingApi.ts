import data from "../../../mocks/fixtures/servicing_demo_001.json";
import { ServicingPayloadSchema } from "../schemas";
import type { ServicingPayload } from "../types";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchServicing(loanId: string): Promise<ServicingPayload> {
  await sleep(250);

  if (loanId === "demo-loan-001") {
    return ServicingPayloadSchema.parse(data);
  }

  // Fallback: reuse demo content, bind to loanId
  return ServicingPayloadSchema.parse({ ...data, loanId });
}
