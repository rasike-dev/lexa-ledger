/**
 * Prompt Template Types
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B1: Prompt Registry (versioned templates)
 * 
 * Core types for versioned, auditable prompt templates.
 */

export type PromptTemplateId =
  | 'EXPLAIN_TRADING_READINESS'
  | 'EXPLAIN_ESG_KPI'
  | 'EXPLAIN_COVENANT'
  | 'EXPLAIN_PORTFOLIO_RISK';

export type PromptTemplateVersion = number;

export type PromptTemplate<TVars extends Record<string, any>> = {
  id: PromptTemplateId;
  version: PromptTemplateVersion;
  
  // A short description for audit/debug
  description: string;

  // Render must return a FULL prompt string ready for model input
  render: (vars: TVars) => string;
};
