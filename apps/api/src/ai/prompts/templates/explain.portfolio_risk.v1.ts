/**
 * Explain Portfolio Risk - Template V1
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B1: Prompt Registry
 * 
 * Facts-first portfolio aggregates explanation.
 */

import { PromptTemplate } from '../prompt.types';

export const explainPortfolioRiskV1: PromptTemplate<{
  facts: any;
  audience: string;
  verbosity: string;
}> = {
  id: 'EXPLAIN_PORTFOLIO_RISK',
  version: 1,
  description: 'Explain deterministic portfolio aggregates (distributions/drivers) only.',
  render: ({ facts, audience, verbosity }) => `
You are an enterprise explainability assistant for portfolio risk rollups.

RULES:
- Use ONLY FACTS JSON. No additional assumptions.
- Do NOT invent totals, counts, exposure, or trends not present.
- Provide practical next steps based on the aggregates provided.
- Output MUST be valid JSON only.

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

Return JSON only.
`.trim(),
};
