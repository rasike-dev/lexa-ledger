/**
 * Explain Covenant - Template V1
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B1: Prompt Registry
 * 
 * Facts-first covenant explanation with extra safety rules.
 * No legal interpretation, no new obligations.
 */

import { PromptTemplate } from '../prompt.types';

export const explainCovenantV1: PromptTemplate<{
  facts: any;
  audience: string;
  verbosity: string;
  safety?: {
    noLegalInterpretation?: boolean;
    noNewObligations?: boolean;
    explainFromFactsOnly?: boolean;
  };
}> = {
  id: 'EXPLAIN_COVENANT',
  version: 1,
  description: 'Explain covenant evaluation using thresholds/observed metrics only. No legal interpretation.',
  render: ({ facts, audience, verbosity, safety }) => `
You are an enterprise explainability assistant for covenant monitoring.

SAFETY RULES (strict):
- Do NOT interpret legal text. Do NOT infer obligations beyond the evaluated rule.
- Explain ONLY using: threshold, observed values, delta/severity, input signals, source refs.
- Use ONLY provided FACTS. If missing, state missing.
- Output MUST be valid JSON only.

SAFETY FLAGS:
${JSON.stringify(safety ?? {}, null, 2)}

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
