/**
 * Prompt Registry
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B1: Prompt Registry (versioned templates)
 * 
 * Central registry for all prompt templates with versioning support.
 * Provides lookup and rendering capabilities.
 */

import { PromptTemplate, PromptTemplateId, PromptTemplateVersion } from './prompt.types';

import { explainTradingReadinessV1 } from './templates/explain.trading.v1';
import { explainEsgKpiV1 } from './templates/explain.esg_kpi.v1';
import { explainCovenantV1 } from './templates/explain.covenant.v1';
import { explainPortfolioRiskV1 } from './templates/explain.portfolio_risk.v1';

type AnyTemplate = PromptTemplate<Record<string, any>>;

/**
 * Registry of all available prompt templates
 * 
 * To add a new template:
 * 1. Create template file in ./templates/
 * 2. Import and add to this array
 * 3. Update PromptTemplateId type
 */
const TEMPLATES: AnyTemplate[] = [
  explainTradingReadinessV1,
  explainEsgKpiV1,
  explainCovenantV1,
  explainPortfolioRiskV1,
];

/**
 * Get a specific prompt template by ID and version
 * 
 * @throws Error if template not found
 */
export function getPromptTemplate(id: PromptTemplateId, version: PromptTemplateVersion): AnyTemplate {
  const tpl = TEMPLATES.find((t) => t.id === id && t.version === version);
  if (!tpl) {
    throw new Error(`Prompt template not found: ${id}@v${version}`);
  }
  return tpl;
}

/**
 * Render a prompt template with variables
 * 
 * Returns the template metadata + rendered prompt string ready for LLM input.
 * The rendered string can be checksummed for audit trails.
 * 
 * @throws Error if template not found or render fails
 */
export function renderPrompt(params: {
  id: PromptTemplateId;
  version: PromptTemplateVersion;
  vars: Record<string, any>;
}): { id: PromptTemplateId; version: number; rendered: string } {
  const tpl = getPromptTemplate(params.id, params.version);
  const rendered = tpl.render(params.vars);

  if (!rendered || typeof rendered !== 'string') {
    throw new Error(`Prompt render returned invalid string for ${params.id}@v${params.version}`);
  }

  return { id: tpl.id, version: tpl.version, rendered };
}

/**
 * Get all registered template IDs and versions
 * 
 * Useful for debugging, audit logs, and template inventory.
 */
export function listPromptTemplates(): Array<{ id: PromptTemplateId; version: number; description: string }> {
  return TEMPLATES.map((t) => ({
    id: t.id,
    version: t.version,
    description: t.description,
  }));
}
