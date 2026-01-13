/**
 * Impact Detection Rules
 * 
 * Week 3 - Track C: Operational Intelligence
 * Step C2: Downstream Impact Detection
 * 
 * Defines the entity graph rules for change propagation.
 * 
 * V1 Rules (Conservative):
 * - Any Document/Amendment change affects all downstream facts
 * - Triggers complete loan refresh (Trading, Covenants, ESG)
 * - Triggers portfolio-level refresh (aggregates)
 * 
 * Future V2 (Optimized):
 * - Parse document type (e.g., "ESG Evidence" only affects ESG KPIs)
 * - Parse amendment type (e.g., "Covenant Amendment" only affects Covenants)
 * - Fine-grained targeting (specific covenant IDs, KPI IDs)
 */

import { ImpactDetection, ImpactSourceAction, ImpactSourceType } from './impact.types';

/**
 * Detect impacts from a source change
 * 
 * V1 Rules (Conservative):
 * - Document/Amendment change → affects all downstream facts
 * - Reason: In loan lifecycle, any document change can affect:
 *   - Trading readiness (document completeness)
 *   - Covenants (amendment clauses)
 *   - ESG KPIs (evidence attachments)
 *   - Portfolio aggregates (rollup stats)
 * 
 * @param params - Source change details
 * @returns Impact detection with targets and reason codes
 * 
 * Example:
 * ```typescript
 * const impact = detectImpactFromSource({
 *   sourceType: 'DOCUMENT',
 *   sourceId: 'doc-123',
 *   sourceAction: 'UPDATED',
 *   loanId: 'loan-001',
 * });
 * 
 * // Returns:
 * // {
 * //   source: { type: 'DOCUMENT', id: 'doc-123', action: 'UPDATED' },
 * //   loanId: 'loan-001',
 * //   targets: [
 * //     { type: 'TRADING_FACTS_RECOMPUTE', loanId: 'loan-001' },
 * //     { type: 'COVENANT_FACTS_RECOMPUTE', loanId: 'loan-001' },
 * //     { type: 'ESG_FACTS_RECOMPUTE', loanId: 'loan-001' },
 * //     { type: 'PORTFOLIO_FACTS_RECOMPUTE' }
 * //   ],
 * //   reasonCodes: [...]
 * // }
 * ```
 */
export function detectImpactFromSource(params: {
  sourceType: ImpactSourceType;
  sourceId: string;
  sourceAction: ImpactSourceAction;
  loanId: string;
}): ImpactDetection {
  // V1 Rules: Conservative approach
  // Any document/amendment change can affect readiness, covenants, ESG evidence, and portfolio rollups
  return {
    source: {
      type: params.sourceType,
      id: params.sourceId,
      action: params.sourceAction,
    },
    loanId: params.loanId,
    targets: [
      // Trading readiness (document completeness affects checklist)
      { type: 'TRADING_FACTS_RECOMPUTE', loanId: params.loanId },
      
      // Covenant facts (amendment clauses can change covenant terms)
      { type: 'COVENANT_FACTS_RECOMPUTE', loanId: params.loanId },
      
      // ESG KPI facts (evidence attachments affect verification status)
      { type: 'ESG_FACTS_RECOMPUTE', loanId: params.loanId },
      
      // Portfolio facts (loan-level changes affect aggregates)
      { type: 'PORTFOLIO_FACTS_RECOMPUTE' },
    ],
    reasonCodes: [
      'SOURCE_CHANGED_DOCUMENT_OR_AMENDMENT',
      'DOWNSTREAM_FACTS_MAY_BE_STALE',
    ],
  };
}

/**
 * Future: Optimized rules (V2)
 * 
 * Parse document/amendment metadata to determine precise impacts:
 * 
 * Example V2 rules:
 * - ESG Evidence document → only ESG_FACTS_RECOMPUTE
 * - Covenant Amendment → only COVENANT_FACTS_RECOMPUTE
 * - Credit Agreement → TRADING_FACTS_RECOMPUTE + COVENANT_FACTS_RECOMPUTE
 * - Facility Letter → TRADING_FACTS_RECOMPUTE only
 * 
 * Implementation approach:
 * 1. Add `documentType` field to Document model
 * 2. Add `amendmentType` field to Amendment model (future)
 * 3. Create type-specific detection functions:
 *    - detectImpactFromEsgEvidence()
 *    - detectImpactFromCovenantAmendment()
 *    - detectImpactFromCreditAgreement()
 * 4. Route detection based on type
 * 
 * Benefits:
 * - Reduced recompute overhead
 * - Faster response time
 * - More precise impact graph
 * - Better audit trail clarity
 */
