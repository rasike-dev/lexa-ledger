/**
 * Impact Detection Types
 * 
 * Week 3 - Track C: Operational Intelligence
 * Step C2: Downstream Impact Detection
 * 
 * Defines the entity graph for change propagation:
 * - Source: What changed (Document, Amendment)
 * - Target: What needs recomputation (Trading, ESG, Covenant, Portfolio facts)
 * - Detection: The complete impact analysis result
 */

/**
 * Impact Source Type
 * 
 * What entity changed that might affect downstream facts?
 */
export type ImpactSourceType =
  | 'DOCUMENT'   // Document created/updated/deleted
  | 'AMENDMENT'; // Amendment created/updated/deleted

/**
 * Impact Source Action
 * 
 * What operation occurred on the source?
 */
export type ImpactSourceAction =
  | 'CREATED'  // New entity
  | 'UPDATED'  // Existing entity changed
  | 'DELETED'; // Entity removed

/**
 * Impact Target
 * 
 * What downstream fact needs recomputation?
 * 
 * Each target type maps to a specific recompute action:
 * - TRADING_FACTS_RECOMPUTE → refresh trading readiness
 * - COVENANT_FACTS_RECOMPUTE → refresh covenant evaluations
 * - ESG_FACTS_RECOMPUTE → refresh ESG KPI evaluations
 * - PORTFOLIO_FACTS_RECOMPUTE → refresh portfolio aggregates
 */
export type ImpactTarget =
  | { type: 'TRADING_FACTS_RECOMPUTE'; loanId: string }
  | { type: 'COVENANT_FACTS_RECOMPUTE'; loanId: string; covenantId?: string }
  | { type: 'ESG_FACTS_RECOMPUTE'; loanId: string; kpiId?: string }
  | { type: 'PORTFOLIO_FACTS_RECOMPUTE' };

/**
 * Impact Detection Result
 * 
 * Complete analysis of a source change and its downstream effects.
 * 
 * Structure:
 * - source: What changed
 * - loanId: Which loan is affected (context)
 * - targets: List of downstream recomputes needed
 * - reasonCodes: Human-readable explanations of why impacts were detected
 * 
 * Example:
 * ```json
 * {
 *   "source": { "type": "DOCUMENT", "id": "doc-123", "action": "UPDATED" },
 *   "loanId": "loan-001",
 *   "targets": [
 *     { "type": "TRADING_FACTS_RECOMPUTE", "loanId": "loan-001" },
 *     { "type": "COVENANT_FACTS_RECOMPUTE", "loanId": "loan-001" },
 *     { "type": "ESG_FACTS_RECOMPUTE", "loanId": "loan-001" },
 *     { "type": "PORTFOLIO_FACTS_RECOMPUTE" }
 *   ],
 *   "reasonCodes": [
 *     "SOURCE_CHANGED_DOCUMENT_OR_AMENDMENT",
 *     "DOWNSTREAM_FACTS_MAY_BE_STALE"
 *   ]
 * }
 * ```
 */
export type ImpactDetection = {
  source: {
    type: ImpactSourceType;
    id: string;
    action: ImpactSourceAction;
  };
  loanId?: string;
  targets: ImpactTarget[];
  reasonCodes: string[];
};
