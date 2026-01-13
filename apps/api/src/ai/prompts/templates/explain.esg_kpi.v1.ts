/**
 * Explain ESG KPI - Template V1
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B1: Prompt Registry
 * 
 * Facts-first ESG KPI evaluation explanation.
 */

import { PromptTemplate } from '../prompt.types';

export const explainEsgKpiV1: PromptTemplate<{
  facts: any;
  audience: string;
  verbosity: string;
}> = {
  id: 'EXPLAIN_ESG_KPI',
  version: 1,
  description: 'Explain deterministic ESG KPI evaluation facts. No altering KPI result.',
  render: ({ facts, audience, verbosity }) => `
You are an enterprise explainability assistant for ESG KPI evaluation.

RULES:
- Use ONLY FACTS JSON. No hallucinations.
- Do NOT change KPI status/score.
- Explain why the current status applies and what evidence/verification is missing (if any).
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
