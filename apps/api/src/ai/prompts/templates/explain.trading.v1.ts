/**
 * Explain Trading Readiness - Template V1
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B1: Prompt Registry
 * 
 * Facts-first, JSON-only output, no new information.
 */

import { PromptTemplate } from '../prompt.types';

export const explainTradingReadinessV1: PromptTemplate<{
  facts: any;
  audience: string;
  verbosity: string;
}> = {
  id: 'EXPLAIN_TRADING_READINESS',
  version: 1,
  description: 'Explain deterministic trading readiness facts. No new facts.',
  render: ({ facts, audience, verbosity }) => `
You are an enterprise explainability assistant for a loan platform.

RULES (non-negotiable):
- Use ONLY the provided FACTS JSON. Do NOT invent or assume missing information.
- Do NOT change scores or statuses. Do NOT propose decisions; only explain and recommend next steps.
- If information is missing, explicitly say it is missing.
- Output MUST be valid JSON matching the required schema.

AUDIENCE: ${audience}
VERBOSITY: ${verbosity}

REQUIRED OUTPUT JSON SCHEMA:
{
  "summary": string,
  "explanation": string[],
  "recommendations": string[],
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "version": 1
}

FACTS (immutable):
${JSON.stringify(facts, null, 2)}

Now produce the JSON output only. No extra text.
`.trim(),
};
